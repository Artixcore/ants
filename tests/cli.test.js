import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createDemoWorkspace } from '../src/demo/create-demo-workspace.js';

test('CLI validates a mission', () => {
  const result = spawnSync(process.execPath, ['src/cli.js', 'validate', 'examples/incidents/node-memory-crash/mission.json'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Valid mission/);
});

test('CLI investigates a prepared local workspace', async () => {
  const demo = await createDemoWorkspace();
  const result = spawnSync(process.execPath, [
    'src/cli.js',
    'investigate',
    demo.missionPath,
    '--workspace',
    demo.workspaceRoot,
    '--output',
    demo.outputDir
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 30000
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: completed/);
  const report = JSON.parse(await readFile(`${demo.outputDir}/report.json`, 'utf8'));
  assert.equal(report.status, 'completed');
});
