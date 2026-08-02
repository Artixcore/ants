import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { redactSecrets } from '../security/redaction.js';

const DEFAULT_MAX_FILES = 5000;
const DEFAULT_MAX_FILE_BYTES = 1024 * 1024;

export class FilesystemTool {
  constructor({ policy, budget, maxFiles = DEFAULT_MAX_FILES, maxFileBytes = DEFAULT_MAX_FILE_BYTES }) {
    this.policy = policy;
    this.budget = budget;
    this.maxFiles = maxFiles;
    this.maxFileBytes = maxFileBytes;
  }

  async list() {
    const files = [];
    await this.#walk(this.policy.workspaceRoot, files);
    return files.sort((left, right) => left.path.localeCompare(right.path));
  }

  async read(relativePath) {
    const resolved = await this.policy.resolveForRead(relativePath);
    const bytesToRead = Math.min(resolved.stat.size, this.maxFileBytes);
    const buffer = await readFile(resolved.absolute);
    const truncated = buffer.length > bytesToRead;
    const selected = buffer.subarray(0, bytesToRead);
    this.budget.consumeBytes(selected.length);
    const redacted = redactSecrets(selected.toString('utf8'));

    return {
      path: resolved.relative,
      sizeBytes: resolved.stat.size,
      bytesRead: selected.length,
      truncated,
      content: redacted.value,
      secretDetected: redacted.secretDetected,
      redaction: redacted.redaction
    };
  }

  async #walk(directory, files) {
    if (files.length >= this.maxFiles) return;
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (files.length >= this.maxFiles) break;
      const absolute = path.join(directory, entry.name);
      const relative = this.policy.relative(absolute);

      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        const prefixAllowed = this.policy.excludeMatchers.every((matcher) => !matcher.test(`${relative}/`));
        if (prefixAllowed) await this.#walk(absolute, files);
        continue;
      }
      if (!entry.isFile() || !this.policy.isAllowedRelative(relative)) continue;

      files.push({ path: relative, extension: path.extname(entry.name).toLowerCase() || null });
    }
  }
}
