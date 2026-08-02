import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { PathPolicy } from '../src/security/path-policy.js';
import { FilesystemTool } from '../src/tools/filesystem.js';
import { BudgetTracker } from '../src/core/budget.js';

function budget() {
  return new BudgetTracker({ durationSeconds: 60, maxTasks: 10, maxToolCalls: 20, maxModelTokens: 0, maxEstimatedCostUsd: 0, maxBytesRead: 100000 });
}

test('filesystem sandbox excludes secrets and rejects symlinks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ants-path-'));
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src', 'index.js'), 'export const ok = true;\n');
  await writeFile(path.join(root, '.env'), 'TOKEN=should-not-be-read\n');
  await symlink(path.join(root, 'src', 'index.js'), path.join(root, 'src', 'link.js'));

  const policy = new PathPolicy({ workspaceRoot: root, include: ['src/**', '.env'], exclude: [] });
  const filesystem = new FilesystemTool({ policy, budget: budget() });
  const files = await filesystem.list();

  assert.deepEqual(files.map((file) => file.path), ['src/index.js']);
  await assert.rejects(() => policy.resolveForRead('src/link.js'), (error) => error.code === 'SANDBOX_VIOLATION');
  await assert.rejects(() => policy.resolveForRead('.env'), (error) => error.code === 'SANDBOX_VIOLATION');
});
