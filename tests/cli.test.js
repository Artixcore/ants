import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createDemoWorkspace } from '../src/demo/create-demo-workspace.js';

const CLI_PATH = path.resolve('src/cli.js');

test('CLI validates the bundled starter mission', () => {
  const result = spawnSync(process.execPath, [CLI_PATH, 'validate', 'mission.json'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Valid mission/);
});

test('CLI initializes and validates a mission in a project directory', async () => {
  const project = await mkdtemp(path.join(tmpdir(), 'ants-cli-init-'));
  const initialized = spawnSync(process.execPath, [CLI_PATH, 'init', 'mission.json'], {
    cwd: project,
    encoding: 'utf8'
  });

  assert.equal(initialized.status, 0, initialized.stderr);
  assert.match(initialized.stdout, /Created mission/);

  const mission = JSON.parse(await readFile(path.join(project, 'mission.json'), 'utf8'));
  assert.equal(mission.mode, 'read-only');
  assert.equal(mission.scope.environment, 'local');

  const validated = spawnSync(process.execPath, [CLI_PATH, 'validate', 'mission.json'], {
    cwd: project,
    encoding: 'utf8'
  });

  assert.equal(validated.status, 0, validated.stderr);
  assert.match(validated.stdout, /Valid mission/);
});

test('CLI refuses to overwrite an existing mission', async () => {
  const project = await mkdtemp(path.join(tmpdir(), 'ants-cli-existing-'));
  const first = spawnSync(process.execPath, [CLI_PATH, 'init', 'mission.json'], {
    cwd: project,
    encoding: 'utf8'
  });
  const second = spawnSync(process.execPath, [CLI_PATH, 'init', 'mission.json'], {
    cwd: project,
    encoding: 'utf8'
  });

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 1);
  assert.match(second.stderr, /Refusing to overwrite/);
});

test('CLI gives an actionable error when a mission file is missing', async () => {
  const project = await mkdtemp(path.join(tmpdir(), 'ants-cli-missing-'));
  const result = spawnSync(process.execPath, [CLI_PATH, 'validate', 'mission.json'], {
    cwd: project,
    encoding: 'utf8'
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Mission file not found/);
  assert.match(result.stderr, /init mission\.json/);
});

test('CLI investigates a prepared local workspace', async () => {
  const demo = await createDemoWorkspace();
  const result = spawnSync(process.execPath, [
    CLI_PATH,
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
