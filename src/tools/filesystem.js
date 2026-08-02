import { constants as fsConstants } from 'node:fs';
import { open, readdir, realpath, lstat } from 'node:fs/promises';
import path from 'node:path';
import { BudgetExceededError, SandboxViolationError } from '../core/errors.js';
import { redactSecrets } from '../security/redaction.js';
import { isWithin } from '../security/path-policy.js';

const DEFAULT_MAX_FILES = 5000;
const DEFAULT_MAX_FILE_BYTES = 1024 * 1024;
const DEFAULT_MAX_DEPTH = 64;

export class FilesystemTool {
  constructor({ policy, budget, maxFiles = DEFAULT_MAX_FILES, maxFileBytes = DEFAULT_MAX_FILE_BYTES, maxDepth = DEFAULT_MAX_DEPTH }) {
    this.policy = policy;
    this.budget = budget;
    this.maxFiles = maxFiles;
    this.maxFileBytes = maxFileBytes;
    this.maxDepth = maxDepth;
  }

  async list() {
    const files = [];
    const queue = [{ directory: this.policy.workspaceRoot, depth: 0 }];

    while (queue.length > 0 && files.length < this.maxFiles) {
      const { directory, depth } = queue.shift();
      const canonicalDirectory = await realpath(directory);
      if (!isWithin(this.policy.workspaceRoot, canonicalDirectory)) {
        throw new SandboxViolationError('Directory traversal escaped the workspace.', { directory });
      }

      let entries;
      try {
        entries = await readdir(canonicalDirectory, { withFileTypes: true });
      } catch (error) {
        if (canonicalDirectory === this.policy.workspaceRoot) throw error;
        continue;
      }

      for (const entry of entries) {
        if (files.length >= this.maxFiles) break;
        const absolute = path.join(canonicalDirectory, entry.name);
        const relative = this.policy.relative(absolute);
        if (entry.isSymbolicLink()) continue;

        if (entry.isDirectory()) {
          if (depth >= this.maxDepth) continue;
          const excluded = this.policy.excludeMatchers.some((matcher) => matcher.test(`${relative}/`));
          if (!excluded) queue.push({ directory: absolute, depth: depth + 1 });
          continue;
        }
        if (!entry.isFile() || !this.policy.isAllowedRelative(relative)) continue;
        files.push({ path: relative, extension: path.extname(entry.name).toLowerCase() || null });
      }
    }

    return files.sort((left, right) => left.path.localeCompare(right.path));
  }

  async read(relativePath) {
    const resolved = await this.policy.resolveForRead(relativePath);
    const remaining = this.budget.remainingBytes();
    const requestedBytes = Math.min(resolved.stat.size, this.maxFileBytes, remaining);
    if (resolved.stat.size > 0 && requestedBytes <= 0) {
      throw new BudgetExceededError('Mission byte-read budget exceeded before reading the file.', {
        path: resolved.relative,
        limit: this.budget.limits.maxBytesRead
      });
    }

    const flags = process.platform === 'win32'
      ? fsConstants.O_RDONLY
      : fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
    const handle = await open(resolved.absolute, flags);
    try {
      const currentStat = await handle.stat();
      if (!currentStat.isFile()) throw new SandboxViolationError('The opened path is not a regular file.', { path: resolved.relative });
      if (resolved.stat.dev !== undefined && currentStat.dev !== resolved.stat.dev) {
        throw new SandboxViolationError('The file changed while it was being opened.', { path: resolved.relative });
      }
      if (resolved.stat.ino !== undefined && currentStat.ino !== resolved.stat.ino) {
        throw new SandboxViolationError('The file changed while it was being opened.', { path: resolved.relative });
      }

      const bytesToRead = Math.min(currentStat.size, this.maxFileBytes, this.budget.remainingBytes());
      const buffer = Buffer.alloc(bytesToRead);
      const result = bytesToRead === 0 ? { bytesRead: 0 } : await handle.read(buffer, 0, bytesToRead, 0);
      const selected = buffer.subarray(0, result.bytesRead);
      this.budget.consumeBytes(selected.length);
      const binary = selected.includes(0);
      const redacted = binary
        ? { value: '', secretDetected: false, redaction: { applied: false, categories: [], removedCount: 0 } }
        : redactSecrets(selected.toString('utf8'));

      return {
        path: resolved.relative,
        sizeBytes: currentStat.size,
        bytesRead: selected.length,
        truncated: currentStat.size > selected.length,
        binary,
        content: redacted.value,
        secretDetected: redacted.secretDetected,
        redaction: redacted.redaction
      };
    } finally {
      await handle.close();
    }
  }
}
