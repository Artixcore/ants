import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { getProjectInfo } from '../src/index.js';

test('project metadata exposes the safe foundation defaults', () => {
  const project = getProjectInfo();

  assert.equal(project.name, 'Ants');
  assert.equal(project.organization, 'Artixcore');
  assert.equal(project.autonomy, 'read-only-by-default');
  assert.equal(Object.isFrozen(project), true);
});

test('CLI reports its version', () => {
  const result = spawnSync(process.execPath, ['./src/cli.js', '--version'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /^0\.1\.0\s*$/);
});
