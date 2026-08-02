import assert from 'node:assert/strict';
import test from 'node:test';
import { redactSecrets } from '../src/security/redaction.js';

test('secret-like values are redacted before evidence storage', () => {
  const result = redactSecrets('Authorization: Bearer abc.def.ghi token=super-secret-value');
  assert.equal(result.secretDetected, true);
  assert.doesNotMatch(result.value, /abc\.def\.ghi|super-secret-value/);
  assert.ok(result.redaction.removedCount >= 1);
});
