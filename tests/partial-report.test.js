import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { createDemoWorkspace } from '../src/demo/create-demo-workspace.js';
import { investigateLocal } from '../src/controller.js';

test('a bounded tool failure produces a partial auditable report', async () => {
  const demo = await createDemoWorkspace();
  const mission = JSON.parse(await readFile(demo.missionPath, 'utf8'));
  mission.budgets.maxToolCalls = 1;
  const missionPath = `${demo.workspaceRoot}/limited-mission.json`;
  await writeFile(missionPath, JSON.stringify(mission), 'utf8');

  const report = await investigateLocal({
    missionPath,
    workspaceRoot: demo.workspaceRoot,
    outputDir: demo.outputDir
  });

  assert.equal(report.status, 'partial');
  assert.ok(report.executionErrors.some((error) => error.code === 'BUDGET_EXCEEDED'));
  assert.ok(report.tasks.some((task) => task.status === 'failed'));
  assert.ok(report.tasks.some((task) => task.role === 'reporter' && task.status === 'completed'));
});
