import { redactSecrets, sanitizeText } from '../security/redaction.js';

export function serializeError(error) {
  const code = typeof error?.code === 'string' ? sanitizeText(error.code).slice(0, 100) : 'UNEXPECTED_ERROR';
  const message = redactSecrets(error?.message ?? 'Unexpected error.').value.slice(0, 2000);
  return {
    code,
    message,
    details: sanitizeValue(error?.details ?? null, new WeakSet(), 0)
  };
}

function sanitizeValue(value, seen, depth) {
  if (depth > 5) return '[truncated]';
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return redactSecrets(value).value.slice(0, 4000);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return `${value}n`;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeValue(item, seen, depth + 1));
  if (typeof value !== 'object') return sanitizeText(String(value)).slice(0, 1000);
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  const output = {};
  for (const key of Object.keys(value).slice(0, 100)) {
    output[sanitizeText(key).slice(0, 200)] = sanitizeValue(value[key], seen, depth + 1);
  }
  seen.delete(value);
  return output;
}
