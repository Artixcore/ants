import { processUpload } from './upload.js';

export async function handleUpload(filePath) {
  return processUpload(filePath);
}
