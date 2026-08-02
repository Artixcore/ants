import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createStarterMission, writeStarterMission } from '../src/core/mission-template.js';
import { validateMission } from '../src/core/mission.js';

test('starter mission is valid and deterministic when values are supplied', () => {
  const mission = createStarterMission({
    now: '2026-08-03T00:00:00.000Z',
    missionId: 'mis_TEST_STARTER_12345678'
  });

  const validated = validateMission(mission);
  assert.equal(validated.missionId, 'mis_TEST_STARTER_12345678');
  assert.equal(validated.createdAt, '2026-08-03T00:00:00.000Z');
  assert.equal(validated.mode, 'read-only');
});

test('starter mission writer creates a valid JSON file without overwriting', async () => {
  const project = await mkdtemp(path.join(tmpdir(), 'ants-mission-template-'));
  const created = await writeStarterMission('mission.json', {
    cwd: project,
    now: '2026-08-03T00:00:00.000Z',
    missionId: 'mis_TEST_WRITER_12345678'
  });
  const mission = JSON.parse(await readFile(created.filePath, 'utf8'));

  assert.equal(validateMission(mission).missionId, 'mis_TEST_WRITER_12345678');
  await assert.rejects(
    () => writeStarterMission('mission.json', { cwd: project }),
    (error) => error.code === 'MISSION_INIT_ERROR' && /Refusing to overwrite/.test(error.message)
  );
});

test('starter mission writer rejects traversal and non-JSON output', async () => {
  const project = await mkdtemp(path.join(tmpdir(), 'ants-mission-path-'));

  await assert.rejects(
    () => writeStarterMission('../mission.json', { cwd: project }),
    (error) => error.code === 'MISSION_INIT_ERROR'
  );
  await assert.rejects(
    () => writeStarterMission('mission.txt', { cwd: project }),
    (error) => error.code === 'MISSION_INIT_ERROR'
  );
});
