import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { SandboxViolationError } from '../core/errors.js';

const DEFAULT_EXCLUDES = [
  '.env',
  '.env.*',
  '**/.env',
  '**/.env.*',
  'node_modules/**',
  '**/node_modules/**',
  '.git/**',
  '**/.git/**',
  '.ants/**',
  '**/.ants/**'
];

function normalizeRelative(value) {
  return value.split(path.sep).join('/').replace(/^\.\//, '');
}

function globToRegExp(glob) {
  const normalized = normalizeRelative(glob)
    .replace(/^[A-Za-z]:\//, '')
    .replace(/^\//, '');
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
    } else if (char === '*') {
      output += '[^/]*';
    } else if (char === '?') {
      output += '[^/]';
    } else {
      output += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }

  output += '$';
  return new RegExp(output);
}

function scopePatternToRelative(pattern, workspaceRoot) {
  if (!path.isAbsolute(pattern)) return normalizeRelative(pattern);

  const relative = path.relative(workspaceRoot, pattern);
  if (!relative.startsWith('..') && !path.isAbsolute(relative)) return normalizeRelative(relative);

  const marker = path.basename(workspaceRoot);
  const normalized = normalizeRelative(pattern);
  const markerIndex = normalized.lastIndexOf(`/${marker}/`);
  if (markerIndex >= 0) return normalized.slice(markerIndex + marker.length + 2);

  return normalized.replace(/^.*?\*\*\//, '**/');
}

export class PathPolicy {
  constructor({ workspaceRoot, include, exclude = [] }) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.includePatterns = include.map((item) => scopePatternToRelative(item, this.workspaceRoot));
    this.excludePatterns = [...DEFAULT_EXCLUDES, ...exclude.map((item) => scopePatternToRelative(item, this.workspaceRoot))];
    this.includeMatchers = this.includePatterns.map(globToRegExp);
    this.excludeMatchers = this.excludePatterns.map(globToRegExp);
  }

  relative(absolutePath) {
    return normalizeRelative(path.relative(this.workspaceRoot, absolutePath));
  }

  isAllowedRelative(relativePath) {
    const normalized = normalizeRelative(relativePath);
    if (!normalized || normalized === '.') return false;
    if (normalized.startsWith('../') || path.isAbsolute(normalized)) return false;
    if (this.excludeMatchers.some((matcher) => matcher.test(normalized))) return false;
    return this.includeMatchers.some((matcher) => matcher.test(normalized));
  }

  async resolveForRead(candidate) {
    const absolute = path.resolve(this.workspaceRoot, candidate);
    const relative = this.relative(absolute);

    if (!this.isAllowedRelative(relative)) {
      throw new SandboxViolationError(`Path is outside mission scope: ${relative}`, { relative });
    }

    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) {
      throw new SandboxViolationError(`Symbolic links are not readable in Phase 3: ${relative}`, { relative });
    }
    if (!stat.isFile()) {
      throw new SandboxViolationError(`Only regular files may be read: ${relative}`, { relative });
    }

    const canonical = await realpath(absolute);
    const rootPrefix = `${this.workspaceRoot}${path.sep}`;
    if (canonical !== this.workspaceRoot && !canonical.startsWith(rootPrefix)) {
      throw new SandboxViolationError(`Canonical path escaped the workspace: ${relative}`, { relative });
    }

    return { absolute: canonical, relative, stat };
  }
}
