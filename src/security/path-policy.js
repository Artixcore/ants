import { lstat, realpath } from 'node:fs/promises';
import { lstatSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { SandboxViolationError } from '../core/errors.js';

const DEFAULT_EXCLUDES = [
  '.env', '.env.*', '**/.env', '**/.env.*',
  'node_modules/**', '**/node_modules/**',
  '.git/**', '**/.git/**',
  '.ants/**', '**/.ants/**',
  '.ssh/**', '**/.ssh/**',
  '*.pem', '**/*.pem', '*.key', '**/*.key', '*.p12', '**/*.p12', '*.pfx', '**/*.pfx'
];

function normalizeRelative(value) {
  return String(value).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

export function globToRegExp(glob) {
  const normalized = normalizeRelative(glob);
  let output = '^';
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === '*' && next === '*') {
      if (normalized[index + 2] === '/') {
        output += '(?:.*/)?';
        index += 2;
      } else {
        output += '.*';
        index += 1;
      }
    } else if (char === '*') output += '[^/]*';
    else if (char === '?') output += '[^/]';
    else output += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }
  return new RegExp(`${output}$`);
}

export function matchesGlob(relativePath, pattern) {
  return globToRegExp(pattern).test(normalizeRelative(relativePath));
}

function validatePattern(pattern) {
  const normalized = normalizeRelative(pattern);
  if (!normalized || /[\0\r\n]/.test(normalized)) {
    throw new SandboxViolationError('Scope patterns must be non-empty and contain no control characters.');
  }
  if (/^(?:[A-Za-z]:\/|\/)/.test(normalized) || normalized.split('/').includes('..')) {
    throw new SandboxViolationError(`Absolute and parent-traversal scope patterns are not allowed: ${normalized}`);
  }
  return normalized;
}

export class PathPolicy {
  constructor({ workspaceRoot, include, exclude = [] }) {
    const requestedRoot = path.resolve(workspaceRoot);
    let requestedStat;
    try {
      requestedStat = lstatSync(requestedRoot);
      if (requestedStat.isSymbolicLink()) {
        throw new SandboxViolationError('The workspace root must not be a symbolic link.', { workspaceRoot: requestedRoot });
      }
      if (!statSync(requestedRoot).isDirectory()) {
        throw new SandboxViolationError('The workspace root must be a directory.', { workspaceRoot: requestedRoot });
      }
      this.workspaceRoot = realpathSync.native(requestedRoot);
    } catch (error) {
      if (error instanceof SandboxViolationError) throw error;
      throw new SandboxViolationError('Unable to open the workspace root.', {
        workspaceRoot: requestedRoot,
        causeCode: error.code ?? 'UNKNOWN'
      }, error);
    }

    this.includePatterns = include.map(validatePattern);
    this.excludePatterns = [...DEFAULT_EXCLUDES, ...exclude.map(validatePattern)];
    this.includeMatchers = this.includePatterns.map(globToRegExp);
    this.excludeMatchers = this.excludePatterns.map(globToRegExp);
  }

  relative(absolutePath) {
    return normalizeRelative(path.relative(this.workspaceRoot, absolutePath));
  }

  isAllowedRelative(relativePath) {
    const normalized = normalizeRelative(relativePath);
    if (!normalized || normalized === '.') return false;
    if (normalized.startsWith('../') || /^(?:[A-Za-z]:\/|\/)/.test(normalized)) return false;
    if (this.excludeMatchers.some((matcher) => matcher.test(normalized))) return false;
    return this.includeMatchers.some((matcher) => matcher.test(normalized));
  }

  async resolveForRead(candidate) {
    if (typeof candidate !== 'string' || candidate.length === 0 || candidate.includes('\0')) {
      throw new SandboxViolationError('Read paths must be non-empty strings without null bytes.');
    }

    const absolute = path.resolve(this.workspaceRoot, candidate);
    const initialRelative = this.relative(absolute);
    if (!this.isAllowedRelative(initialRelative)) {
      throw new SandboxViolationError(`Path is outside mission scope: ${initialRelative}`, { relative: initialRelative });
    }

    let initialStat;
    try {
      initialStat = await lstat(absolute);
    } catch (error) {
      throw new SandboxViolationError(`Unable to inspect in-scope path: ${initialRelative}`, {
        relative: initialRelative,
        causeCode: error.code ?? 'UNKNOWN'
      }, error);
    }
    if (initialStat.isSymbolicLink()) {
      throw new SandboxViolationError(`Symbolic links are not readable: ${initialRelative}`, { relative: initialRelative });
    }
    if (!initialStat.isFile()) {
      throw new SandboxViolationError(`Only regular files may be read: ${initialRelative}`, { relative: initialRelative });
    }

    const canonical = await realpath(absolute);
    if (!isWithin(this.workspaceRoot, canonical)) {
      throw new SandboxViolationError(`Canonical path escaped the workspace: ${initialRelative}`, { relative: initialRelative });
    }
    const canonicalRelative = this.relative(canonical);
    if (!this.isAllowedRelative(canonicalRelative)) {
      throw new SandboxViolationError(`Canonical path is outside mission scope: ${canonicalRelative}`, { relative: canonicalRelative });
    }

    return { absolute: canonical, relative: canonicalRelative, stat: initialStat };
  }
}

export function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
