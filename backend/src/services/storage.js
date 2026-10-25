import crypto from 'node:crypto';
import { admin } from '../lib/supabase.js';
import config from '../config.js';
import logger from '../lib/logger.js';
import { HttpError } from '../lib/errors.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60; // same 7 days as the old S3 presigned URLs

// Signed URLs are reused instead of re-signed on every request: that saves a Storage round-trip on
// every cat list / photo list, and a stable URL lets the phone and the CDN cache the image.
// Reused for 6 of their 7 days, so a URL handed out always has at least a day left.
// Safe because every object path is immutable: a new photo always gets a new path (see uploadCatPhoto).
const URL_REUSE_MS = (SIGNED_URL_TTL_SECONDS - 24 * 60 * 60) * 1000;
const URL_CACHE_MAX = 5000;
const urlCache = new Map(); // path -> { url, until }

function cachedUrl(path, now) {
  const hit = urlCache.get(path);
  if (!hit) return null;
  if (hit.until <= now) {
    urlCache.delete(path);
    return null;
  }
  return hit.url;
}

function cacheUrl(path, url, now) {
  if (urlCache.size >= URL_CACHE_MAX) urlCache.delete(urlCache.keys().next().value); // oldest first
  urlCache.set(path, { url, until: now + URL_REUSE_MS });
}

const bucket = () => admin.storage.from(config.supabase.photoBucket);

function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

function decodeImage(dataUri) {
  const base64 = String(dataUri).replace(/^data:image\/[\w.+-]+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length === 0) throw new HttpError(400, 'ValidationError', 'Photo is empty or not valid base64');
  if (buffer.length > MAX_PHOTO_BYTES) throw new HttpError(413, 'PayloadTooLarge', 'Photo must be 5 MB or smaller');

  const contentType = sniffImageType(buffer); // trust the bytes, not the client's claim
  if (!contentType) throw new HttpError(400, 'ValidationError', 'Photo must be a JPEG, PNG or WebP image');
  return { buffer, contentType };
}

async function uploadImage(path, dataUri, { upsert = false } = {}) {
  const { buffer, contentType } = decodeImage(dataUri);
  // Paths are never reused, so the bytes behind one never change: let the CDN and phones keep them.
  const { error } = await bucket().upload(path, buffer, { contentType, upsert, cacheControl: String(SIGNED_URL_TTL_SECONDS) });
  if (error) throw error;
  return path;
}

/**
 * Profile/cover photo. Each upload gets a new path, so a changed photo also gets a new URL (no stale
 * copy from the CDN or the URL cache); the caller deletes the previous file once the cat row points at
 * the new one. Returns the storage path to persist in cats.photo_path.
 */
const uploadCatPhoto = (userId, catId, dataUri) => uploadImage(`${userId}/${catId}/profile-${crypto.randomUUID()}`, dataUri);

/** Gallery photo. One object per photo row; the caller supplies the new photo_id. */
const uploadGalleryPhoto = (userId, catId, photoId, dataUri) => uploadImage(`${userId}/${catId}/photos/${photoId}`, dataUri);

/** Sign many paths in a single call. Failures degrade to "no photo" rather than failing the request. */
async function signPhotoPaths(paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  const urls = new Map();
  if (unique.length === 0) return urls;

  const now = Date.now();
  const missing = [];
  for (const path of unique) {
    const url = cachedUrl(path, now);
    if (url) urls.set(path, url);
    else missing.push(path);
  }
  if (missing.length === 0) return urls;

  const { data, error } = await bucket().createSignedUrls(missing, SIGNED_URL_TTL_SECONDS);
  if (error) {
    logger.error({ err: error }, 'Failed to sign photo URLs');
    return urls;
  }
  for (const item of data ?? []) {
    if (item.signedUrl && !item.error) {
      urls.set(item.path, item.signedUrl);
      cacheUrl(item.path, item.signedUrl, now);
    }
  }
  return urls;
}

async function deletePhotos(paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;
  for (const path of unique) urlCache.delete(path);
  const { error } = await bucket().remove(unique);
  if (error) logger.error({ err: error }, 'Failed to delete photos'); // non-fatal: DB state is what matters
}

/** Tests only. */
const clearSignedUrlCache = () => urlCache.clear();

export { uploadCatPhoto, uploadGalleryPhoto, signPhotoPaths, deletePhotos, clearSignedUrlCache };
