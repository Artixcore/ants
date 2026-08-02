import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { createDemoWorkspace } from '../src/demo/create-demo-workspace.js';
import { investigateLocal } from '../src/controller.js';

const FIXED_TIME = '2026-08-03T00:30:00.000Z';

test('local MVP identifies the deterministic Node.js heap exhaustion incident', async () => {
  const demo = await createDemoWorkspace();
  const report = await investigateLocal({
    missionPath: demo.missionPath,
    workspaceRoot: demo.workspaceRoot,
    outputDir: demo.outputDir,
    clock: () => FIXED_TIME,
    nowMs: () => Date.parse(FIXED_TIME)
  });

  assert.equal(report.status, 'completed');
  assert.equal(report.engineVersion, '0.3.1');
  assert.equal(report.safety.readOnly, true);
  assert.equal(report.safety.outputRestrictedToWorkspaceAnts, true);
  assert.equal(report.safety.mutationsAttempted, 0);
  assert.match(report.summary, /JavaScript heap/i);

  const primary = report.hypotheses.find((item) => item.hypothesisId === report.primaryHypothesisId);
  assert.ok(primary);
  assert.equal(primary.status, 'supported');
  assert.ok(primary.confidence.score >= 0.75);
  assert.ok(primary.independenceGroups.length >= 3);
  assert.ok(primary.validations.some((validation) => validation.outcome === 'supported'));
  assert.ok(primary.supportEvidenceIds.length >= 4);
  assert.ok(report.recommendations.some((item) => /Stream uploads/i.test(item)));

  const evidenceTypes = new Set(report.evidenceIndex.map((item) => item.type));
  assert.ok(evidenceTypes.has('log'));
  assert.ok(evidenceTypes.has('system'));
  assert.ok(evidenceTypes.has('file'));
  assert.ok(evidenceTypes.has('git'));
  assert.ok(report.graph.edges.some((edge) => edge.type === 'supports'));
  assert.ok(report.audit.every((event) => event.operation === 'read'));
  assert.ok(report.tasks.every((task) => task.status === 'completed'));

  for (const file of ['report.json', 'report.md', 'evidence.jsonl', 'hypotheses.json', 'graph.json', 'audit.json']) {
    assert.equal((await stat(`${demo.outputDir}/${file}`)).isFile(), true);
  }

  const markdown = await readFile(`${demo.outputDir}/report.md`, 'utf8');
  assert.match(markdown, /Leading hypothesis/);
  assert.match(markdown, /Safety statement/);
});
