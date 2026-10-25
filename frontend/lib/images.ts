import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Longest edge, in pixels, of a photo we upload. Phone cameras take 12–48 MP pictures (4–12 MB);
 * shown at most full-screen, 1600 px looks the same and is ~10× smaller to upload, store and download.
 */
export const UPLOAD_MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

/**
 * A local image as a JPEG data URI, shrunk so its longest edge is at most `maxEdge` (never enlarged).
 * Also normalizes PNG/HEIC to JPEG, which is what the API stores.
 */
export async function prepareImageForUpload(
  uri: string,
  maxEdge = UPLOAD_MAX_EDGE,
): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  let image = await context.renderAsync();
  if (Math.max(image.width, image.height) > maxEdge) {
    context
      .reset()
      .resize(
        image.width >= image.height ? { width: maxEdge } : { height: maxEdge },
      );
    image = await context.renderAsync();
  }
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
    base64: true,
  });
  if (!saved.base64)
    throw new Error('Could not read that photo. Try choosing it again.');
  return `data:image/jpeg;base64,${saved.base64}`;
}
