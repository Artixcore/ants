import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { getProjectInfo } from '../src/index.js';

test('project metadata exposes the Phase 3 safety defaults', () => {
  const project = getProjectInfo();

  assert.equal(project.name, 'Ants');
  assert.equal(project.organization, 'Artixcore');
  assert.equal(project.status, 'local-investigation-mvp-hardened');
  assert.equal(project.autonomy, 'read-only-by-default');
  assert.equal(project.currentPhase, 3);
  assert.equal(project.nextPhase, 'repository-and-ci-integrations');
  assert.equal(Object.isFrozen(project), true);
});

test('CLI reports its version', () => {
  const result = spawnSync(process.execPath, ['./src/cli.js', '--version'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /^0\.3\.1\s*$/);
});
