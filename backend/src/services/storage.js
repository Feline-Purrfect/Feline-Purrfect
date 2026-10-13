import { admin } from '../lib/supabase.js';
import config from '../config.js';
import logger from '../lib/logger.js';
import { HttpError } from '../lib/errors.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60; // same 7 days as the old S3 presigned URLs

const bucket = () => admin.storage.from(config.supabase.photoBucket);

function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

/**
 * Upload a base64 / data-URI image. One fixed object per cat (overwritten on change), so there
 * are never orphaned files. Returns the storage path to persist in cats.photo_path.
 */
async function uploadCatPhoto(userId, catId, dataUri) {
  const base64 = String(dataUri).replace(/^data:image\/[\w.+-]+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length === 0) throw new HttpError(400, 'ValidationError', 'Photo is empty or not valid base64');
  if (buffer.length > MAX_PHOTO_BYTES) throw new HttpError(413, 'PayloadTooLarge', 'Photo must be 5 MB or smaller');

  const contentType = sniffImageType(buffer); // trust the bytes, not the client's claim
  if (!contentType) throw new HttpError(400, 'ValidationError', 'Photo must be a JPEG, PNG or WebP image');

  const path = `${userId}/${catId}/profile`;
  const { error } = await bucket().upload(path, buffer, { contentType, upsert: true, cacheControl: '3600' });
  if (error) throw error;
  return path;
}

/** Sign many paths in a single call. Failures degrade to "no photo" rather than failing the request. */
async function signPhotoPaths(paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  const urls = new Map();
  if (unique.length === 0) return urls;

  const { data, error } = await bucket().createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error) {
    logger.error({ err: error }, 'Failed to sign photo URLs');
    return urls;
  }
  for (const item of data ?? []) if (item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  return urls;
}

async function deletePhotos(paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;
  const { error } = await bucket().remove(unique);
  if (error) logger.error({ err: error }, 'Failed to delete photos'); // non-fatal: DB state is what matters
}

export { uploadCatPhoto, signPhotoPaths, deletePhotos };
