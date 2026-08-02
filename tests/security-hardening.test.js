import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadMission, validateMission } from '../src/core/mission.js';
import { BudgetTracker } from '../src/core/budget.js';
import { TaskScheduler } from '../src/core/task-scheduler.js';
import { stableHash } from '../src/core/ids.js';
import { serializeError } from '../src/core/safe-error.js';
import { PathPolicy } from '../src/security/path-policy.js';
import { prepareOutputDirectory } from '../src/security/output-policy.js';
import { FilesystemTool } from '../src/tools/filesystem.js';
import { GitTool } from '../src/tools/git.js';
import { ToolGateway } from '../src/tools/tool-gateway.js';
import { EvidenceStore } from '../src/store/evidence-store.js';
import { InvestigationGraph } from '../src/store/graph-store.js';
import { runScout } from '../src/agents/scout.js';

function mission(overrides = {}) {
  return {
    schemaVersion: '1.0.0',
    missionId: 'mis_01JHARDENINGTEST',
    title: 'Investigate a local service failure',
    objective: 'Determine the most likely cause from bounded local evidence.',
    mode: 'read-only',
    scope: { environment: 'local', include: ['logs/**', 'src/**', 'package.json'], exclude: ['.env'] },
    permissions: [
      { resourceType: 'filesystem', operation: 'read', scope: '**' },
      { resourceType: 'git', operation: 'read', scope: '.' }
    ],
    budgets: {
      durationSeconds: 60,
      maxTasks: 10,
      maxTaskDepth: 4,
      maxToolCalls: 100,
      maxModelTokens: 0,
      maxEstimatedCostUsd: 0,
      maxBytesRead: 10_000_000,
      maxRetriesPerTask: 1
    },
    stopConditions: {
      minimumConfidence: 0.75,
      requiredIndependentValidations: 1,
      maxNoProgressTasks: 3,
      completeWhenDefensible: true,
      pauseOnSecretDetection: true
    },
    reporting: {
      format: 'markdown+json',
      includeEvidenceIndex: true,
      includeContradictions: true,
      includeLimitations: true
    },
    requestedBy: { type: 'test', id: 'hardening' },
    createdAt: '2026-08-03T00:00:00Z',
    ...overrides
  };
}

function budget(overrides = {}) {
  return new BudgetTracker({
    durationSeconds: 60,
    maxTasks: 10,
    maxToolCalls: 100,
    maxModelTokens: 0,
    maxEstimatedCostUsd: 0,
    maxBytesRead: 10_000_000,
    ...overrides
  });
}

test('mission validation returns structured errors for malformed collections', () => {
  const input = mission({ permissions: { operation: 'read' }, unexpected: true });
  assert.throws(
    () => validateMission(input),
    (error) => error.code === 'MISSION_VALIDATION_ERROR' &&
      error.details.some((item) => item.includes('permissions must be an array')) &&
      error.details.some((item) => item.includes('Unknown field'))
  );
});

test('mission validation rejects unsafe paths, fractional budgets, and invalid dates', () => {
  const input = mission();
  input.scope.include = ['../secrets/**'];
  input.budgets.maxTasks = 4.5;
  input.createdAt = 'not-a-date';
  assert.throws(
    () => validateMission(input),
    (error) => error.details.some((item) => item.includes('safe relative')) &&
      error.details.some((item) => item.includes('maxTasks')) &&
      error.details.some((item) => item.includes('createdAt'))
  );
});

test('mission loading rejects oversized files and symbolic links', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ants-mission-'));
  const oversized = path.join(root, 'oversized.json');
  await writeFile(oversized, ' '.repeat(1024 * 1024 + 1));
  await assert.rejects(() => loadMission(oversized), (error) =>
    error.code === 'MISSION_VALIDATION_ERROR' && /size limit/.test(error.message)
  );

  const validPath = path.join(root, 'valid.json');
  const linkPath = path.join(root, 'mission-link.json');
  await writeFile(validPath, JSON.stringify(mission()));
  await symlink(validPath, linkPath);
  await assert.rejects(() => loadMission(linkPath), (error) =>
    error.code === 'MISSION_VALIDATION_ERROR' && /symbolic links/.test(error.message)
  );
});

test('validated missions are deeply frozen', () => {
  const validated = validateMission(mission());
  assert.equal(Object.isFrozen(validated), true);
  assert.equal(Object.isFrozen(validated.scope), true);
  assert.equal(Object.isFrozen(validated.permissions[0]), true);
});

test('filesystem reads only the configured prefix and identifies binary data', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ants-fs-'));
  await mkdir(path.join(root, 'logs'));
  await writeFile(path.join(root, 'logs', 'large.log'), 'A'.repeat(2_000_000));
  await writeFile(path.join(root, 'logs', 'binary.log'), Buffer.from([1, 2, 0, 3, 4]));
  const policy = new PathPolicy({ workspaceRoot: root, include: ['logs/**'], exclude: [] });
  const filesystem = new FilesystemTool({ policy, budget: budget(), maxFileBytes: 1024 });

  const large = await filesystem.read('logs/large.log');
  assert.equal(large.bytesRead, 1024);
  assert.equal(large.content.length, 1024);
  assert.equal(large.truncated, true);

  const binary = await filesystem.read('logs/binary.log');
  assert.equal(binary.binary, true);
  assert.equal(binary.content, '');
});

test('output policy rejects external, in-source, and symlinked destinations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ants-output-'));
  await mkdir(path.join(root, 'src'));
  await assert.rejects(
    () => prepareOutputDirectory({ workspaceRoot: root, requestedOutput: 'src/report', missionId: 'mis_01JHARDENINGTEST' }),
    (error) => error.code === 'OUTPUT_SAFETY_ERROR'
  );
  await assert.rejects(
    () => prepareOutputDirectory({ workspaceRoot: root, requestedOutput: path.join(tmpdir(), 'outside-report'), missionId: 'mis_01JHARDENINGTEST' }),
    (error) => error.code === 'OUTPUT_SAFETY_ERROR'
  );

  const outside = await mkdtemp(path.join(tmpdir(), 'ants-link-target-'));
  await symlink(outside, path.join(root, '.ants'));
  await assert.rejects(
    () => prepareOutputDirectory({ workspaceRoot: root, requestedOutput: '.ants/report', missionId: 'mis_01JHARDENINGTEST' }),
    (error) => error.code === 'OUTPUT_SAFETY_ERROR'
  );
});

test('tool gateway validates arguments, enforces permission scope, and audits denials', async () => {
  const scopedMission = validateMission({
    ...mission(),
    permissions: [{ resourceType: 'filesystem', operation: 'read', scope: 'logs/**' }]
  });
  const gateway = new ToolGateway({
    mission: scopedMission,
    budget: budget(),
    filesystem: {
      list: async () => [{ path: 'logs/app.log' }, { path: 'src/app.js' }],
      read: async (file) => ({ path: file, content: 'ok' })
    },
    git: { log: () => ({}), recentDiff: () => ({}) },
    clock: () => '2026-08-03T00:00:00Z'
  });
  const context = { taskId: 'task_12345678', agentRunId: 'run_12345678' };

  const listed = await gateway.call('filesystem.list', {}, context);
  assert.deepEqual(listed.data.map((item) => item.path), ['logs/app.log']);
  await assert.rejects(() => gateway.call('filesystem.read', { path: 'src/app.js' }, context), /does not authorize/);
  assert.equal(gateway.snapshot().at(-1).status, 'failed');
  await assert.rejects(() => gateway.call('filesystem.read', { path: 'logs/app.log', extra: true }, context), /unknown fields/);
  assert.equal(gateway.snapshot().at(-1).status, 'failed');
  assert.equal(gateway.snapshot().length, 3);
});

test('reporter tasks can run after the normal duration budget expires', async () => {
  let time = 0;
  const trackedBudget = new BudgetTracker({ durationSeconds: 1, maxTasks: 4, maxToolCalls: 1, maxModelTokens: 0, maxEstimatedCostUsd: 0 }, { now: () => time });
  const scheduler = new TaskScheduler({ missionId: 'mis_01JHARDENINGTEST', budget: trackedBudget, clock: () => new Date(time).toISOString() });
  await scheduler.run('scout', 'test', async () => ({ progressMade: true }));
  time = 5000;
  const result = await scheduler.run('reporter', 'safety report', async () => ({ progressMade: true }), { budgetExempt: true });
  assert.equal(result.progressMade, true);
  assert.equal(scheduler.snapshot().at(-1).budgetExempt, true);
});

test('secret detection can continue with redacted evidence when pause is disabled', async () => {
  const testMission = validateMission({
    ...mission(),
    permissions: [{ resourceType: 'filesystem', operation: 'read', scope: '**' }],
    stopConditions: { ...mission().stopConditions, pauseOnSecretDetection: false }
  });
  let sequence = 0;
  const gateway = {
    mission: testMission,
    filesystem: { policy: { workspaceRoot: '/safe/workspace' } },
    git: { available: () => false },
    canCall: () => false,
    async call(toolId, args) {
      sequence += 1;
      if (toolId === 'filesystem.list') return { toolCallId: `call_1234567${sequence}`, data: [{ path: 'src/app.js', extension: '.js' }] };
      return {
        toolCallId: `call_1234567${sequence}`,
        data: {
          path: args.path,
          sizeBytes: 100,
          bytesRead: 100,
          truncated: false,
          binary: false,
          content: "const token = '[REDACTED:github-token]'; readFile('x');",
          secretDetected: true,
          redaction: { applied: true, categories: ['github-token'], removedCount: 1 }
        }
      };
    }
  };
  const evidenceStore = new EvidenceStore({ missionId: testMission.missionId, clock: () => '2026-08-03T00:00:00Z' });
  const graph = new InvestigationGraph({ missionId: testMission.missionId });
  const result = await runScout({
    context: { taskId: 'task_12345678', agentRunId: 'run_12345678' },
    gateway,
    evidenceStore,
    graph
  });
  assert.equal(result.secretDetected, true);
  assert.ok(evidenceStore.find((record) => record.type === 'security').length > 0);
  assert.ok(evidenceStore.find((record) => record.source.type === 'source-file').length > 0);
});

test('stable hashing supports undefined and rejects cycles predictably', () => {
  assert.equal(typeof stableHash({ value: undefined }), 'string');
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => stableHash(cyclic), /cyclic/);
});

test('error serialization redacts secrets and removes terminal controls', () => {
  const error = new Error('\u001b[31mtoken=ghp_abcdefghijklmnopqrstuvwxyz123456');
  const safe = serializeError(error);
  assert.doesNotMatch(safe.message, /ghp_/);
  assert.doesNotMatch(safe.message, /\u001b/);
});

test('git diff does not execute repository textconv or external diff commands', { skip: process.platform === 'win32' }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ants-git-'));
  const marker = path.join(root, 'executed.txt');
  const script = path.join(root, 'evil.sh');
  await writeFile(script, `#!/bin/sh\necho executed >> "${marker}"\ncat "$1"\n`);
  await chmod(script, 0o700);
  await writeFile(path.join(root, '.gitattributes'), '*.txt diff=evil\n');
  await writeFile(path.join(root, 'data.txt'), 'first\n');
  git(root, ['init', '--initial-branch=master']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'Test']);
  git(root, ['config', 'diff.evil.textconv', script]);
  git(root, ['config', 'diff.evil.command', script]);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'first']);
  await writeFile(path.join(root, 'data.txt'), 'second\n');
  git(root, ['add', 'data.txt']);
  git(root, ['commit', '-m', 'second']);

  const tool = new GitTool({ workspaceRoot: root, budget: budget() });
  const history = tool.log(20);
  assert.equal(history.entries.length, 2);
  const result = tool.recentDiff();
  assert.equal(result.available, true);
  assert.deepEqual(result.changedFiles, ['data.txt']);
  await assert.rejects(() => readFile(marker, 'utf8'), (error) => error.code === 'ENOENT');
});

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error(result.stderr);
}
