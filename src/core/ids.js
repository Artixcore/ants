import { createHash } from 'node:crypto';

export function stableHash(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function stableId(prefix, value, length = 20) {
  return `${prefix}_${stableHash(value).slice(0, length)}`;
}

export function stableStringify(value) {
  return serialize(value, new WeakSet());
}

function serialize(value, seen) {
  if (value === undefined) return '"[undefined]"';
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : JSON.stringify(String(value));
  if (typeof value === 'bigint') return JSON.stringify(`${value}n`);
  if (typeof value === 'symbol' || typeof value === 'function') return JSON.stringify(String(value));
  if (value instanceof Date) return JSON.stringify(value.toISOString());

  if (seen.has(value)) throw new TypeError('Cannot create a stable hash for a cyclic value.');
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => serialize(item, seen)).join(',')}]`;
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serialize(value[key], seen)}`)
      .join(',')}}`;
  } finally {
    seen.delete(value);
  }
}
