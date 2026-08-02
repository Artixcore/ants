import { readFile } from 'node:fs/promises';

const uploadCache = [];

export async function processUpload(filePath) {
  const source = await readFile(filePath);
  const retryCopy = Buffer.from(source);
  uploadCache.push(retryCopy);

  return {
    bytes: retryCopy.length,
    cachedUploads: uploadCache.length
  };
}
