import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { validateMission } from '../src/core/mission.js';

async function fixtureMission() {
  return JSON.parse(await readFile('examples/incidents/node-memory-crash/mission.json', 'utf8'));
}

test('Phase 3 accepts the deterministic read-only mission', async () => {
  const mission = validateMission(await fixtureMission());
  assert.equal(mission.mode, 'read-only');
  assert.equal(mission.scope.environment, 'local');
});

test('Phase 3 rejects write permissions', async () => {
  const mission = await fixtureMission();
  mission.permissions.push({ resourceType: 'filesystem', operation: 'write', scope: '**' });

  assert.throws(
    () => validateMission(mission),
    (error) => error.code === 'MISSION_VALIDATION_ERROR' && error.details.some((item) => item.includes('not read-only'))
  );
});

test('Phase 3 rejects production missions', async () => {
  const mission = await fixtureMission();
  mission.scope.environment = 'production';

  assert.throws(() => validateMission(mission), /Mission validation failed/);
});
