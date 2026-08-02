import { createReadStream } from 'node:fs';

export async function processUpload(filePath, destination) {
  const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 });
  for await (const chunk of stream) {
    await destination.write(chunk);
  }
  return { streamed: true };
}
