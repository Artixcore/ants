import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const schemaPaths = [
  'schemas/mission.schema.json',
  'schemas/evidence.schema.json',
  'schemas/hypothesis.schema.json',
  'schemas/tool-call.schema.json',
  'schemas/agent-message.schema.json',
  'schemas/provider-request.schema.json'
];

const documentPaths = [
  'docs/architecture.md',
  'docs/agents.md',
  'docs/mission.md',
  'docs/evidence.md',
  'docs/investigation-graph.md',
  'docs/tools.md',
  'docs/providers.md',
  'docs/security.md',
  'docs/memory.md',
  'docs/cloud.md',
  'docs/api.md',
  'docs/adr/README.md'
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('Phase 2 architecture documents exist', () => {
  for (const path of documentPaths) {
    assert.equal(existsSync(path), true, `${path} should exist`);
  }
});

test('architecture schemas are valid JSON Schema documents', () => {
  for (const path of schemaPaths) {
    const schema = readJson(path);

    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.match(schema.$id, /^https:\/\/github\.com\/Artixcore\/ants\/schemas\//);
    assert.equal(schema.type, 'object');
    assert.equal(schema.additionalProperties, false);
  }
});

test('example mission follows the Phase 2 safety defaults', () => {
  const mission = readJson('examples/missions/node-service-failure.json');

  assert.equal(mission.schemaVersion, '1.0.0');
  assert.equal(mission.mode, 'read-only');
  assert.equal(mission.scope.environment, 'local');
  assert.ok(mission.scope.exclude.includes('/workspace/service/.env'));
  assert.ok(mission.permissions.every(({ operation }) => operation === 'read'));
  assert.ok(mission.budgets.maxTasks > 0);
  assert.ok(mission.stopConditions.requiredIndependentValidations >= 1);
});

test('example evidence preserves provenance and independence', () => {
  const evidence = readJson('examples/evidence/memory-series.json');

  assert.equal(evidence.schemaVersion, '1.0.0');
  assert.match(evidence.evidenceId, /^ev_/);
  assert.match(evidence.collector.toolCallId, /^call_/);
  assert.equal(evidence.contentHash.algorithm, 'sha256');
  assert.ok(evidence.independenceGroup.length > 0);
  assert.notEqual(evidence.sensitivity, 'secret-detected');
});

test('example hypothesis cites evidence and independent validation', () => {
  const hypothesis = readJson('examples/hypotheses/image-buffer-growth.json');

  assert.equal(hypothesis.schemaVersion, '1.0.0');
  assert.ok(hypothesis.supportEvidenceIds.includes('ev_01JMEMORYSERIES'));
  assert.ok(hypothesis.independenceGroups.length >= 2);
  assert.ok(hypothesis.validations.length >= 1);
  assert.ok(hypothesis.confidence.score >= 0 && hypothesis.confidence.score <= 1);
  assert.ok(hypothesis.confidence.rationale.length > 0);
});
