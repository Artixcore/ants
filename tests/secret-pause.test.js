import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import test from 'node:test';
import { createDemoWorkspace } from '../src/demo/create-demo-workspace.js';
import { investigateLocal } from '../src/controller.js';

test('secret detection redacts content and pauses deeper agents', async () => {
  const demo = await createDemoWorkspace();
  await writeFile(`${demo.workspaceRoot}/src/credentials.js`, "export const token = 'ghp_abcdefghijklmnopqrstuvwxyz123456';\n", 'utf8');

  const report = await investigateLocal({
    missionPath: demo.missionPath,
    workspaceRoot: demo.workspaceRoot,
    outputDir: demo.outputDir
  });

  assert.equal(report.status, 'paused');
  assert.equal(report.safety.secretDetected, true);
  assert.equal(report.hypotheses.length, 0);
  assert.deepEqual(report.tasks.map((task) => task.role), ['scout', 'reporter']);
  const securityEvidence = report.evidenceIndex.find((item) => item.type === 'security');
  assert.ok(securityEvidence);
  assert.equal(securityEvidence.sensitivity, 'secret-detected');
});
