import { createHash } from 'node:crypto';

export function stableHash(value) {
  const serialized = typeof value === 'string' ? value : stableStringify(value);
  return createHash('sha256').update(serialized).digest('hex');
}

export function stableId(prefix, value, length = 20) {
  return `${prefix}_${stableHash(value).slice(0, length)}`;
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}
