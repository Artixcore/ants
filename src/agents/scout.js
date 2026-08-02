import path from 'node:path';
import { analyzeLog } from '../tools/logs.js';
import { normalizeRuntimeArtifact } from '../tools/runtime.js';
import { analyzeSource } from '../analysis/source-signals.js';

const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts']);
const LOG_EXTENSIONS = new Set(['.log', '.out', '.txt']);
const RUNTIME_NAMES = new Set(['package.json', 'runtime.json', 'system.json', 'process.json', 'metrics.json']);
const TOOL_VERSION = '0.3.1';

export async function runScout({ context, gateway, evidenceStore, graph }) {
  const inventoryCall = await gateway.call('filesystem.list', {}, context);
  const files = inventoryCall.data;
  const inventory = evidenceStore.add({
    taskId: context.taskId,
    agentRunId: context.agentRunId,
    type: 'file',
    source: { type: 'filesystem-inventory', identifier: gateway.filesystem.policy.workspaceRoot },
    collector: collector('filesystem.list', inventoryCall.toolCallId),
    content: {
      kind: 'inline',
      value: { fileCount: files.length, files: files.map((file) => file.path) },
      format: 'application/json'
    },
    independenceGroup: 'filesystem:inventory',
    integrity: 'verified',
    tags: ['inventory']
  });
  graph.addEvidence(inventory);

  let newEvidence = 1;
  let secretDetected = false;
  const pauseOnSecret = gateway.mission.stopConditions.pauseOnSecretDetection === true;
  const sourceFiles = files.filter((file) => SOURCE_EXTENSIONS.has(file.extension)).slice(0, 200);
  const logFiles = files.filter((file) => LOG_EXTENSIONS.has(file.extension) && /(?:^|\/)(?:logs?|diagnostics?)\//i.test(file.path)).slice(0, 100);
  const runtimeFiles = files.filter((file) => RUNTIME_NAMES.has(path.basename(file.path))).slice(0, 50);

  for (const file of logFiles) {
    const call = await gateway.call('filesystem.read', { path: file.path }, context);
    const artifact = call.data;
    if (artifact.secretDetected) {
      addSecretEvidence({ context, call, artifact, source: file.path, sourceType: 'local-file', toolId: 'filesystem.read', evidenceStore, graph });
      newEvidence += 1;
      secretDetected = true;
      if (pauseOnSecret) return pausedResult(file.path, files.length, newEvidence);
    }
    if (artifact.binary) continue;
    const analysis = analyzeLog(file.path, artifact.content);
    if (analysis.matches.length === 0) continue;
    const evidence = evidenceStore.add({
      taskId: context.taskId,
      agentRunId: context.agentRunId,
      type: 'log',
      source: { type: 'local-file', identifier: file.path, location: file.path },
      collector: collector('filesystem.read', call.toolCallId),
      content: { kind: 'inline', value: analysis, format: 'application/json' },
      independenceGroup: `log:${file.path}`,
      integrity: artifact.truncated ? 'partial' : 'captured',
      sensitivity: artifact.secretDetected ? 'confidential' : 'internal',
      redaction: artifact.redaction,
      tags: ['log-analysis', ...new Set(analysis.matches.map((match) => match.signal))]
    });
    graph.addEvidence(evidence);
    newEvidence += 1;
  }

  for (const file of runtimeFiles) {
    const call = await gateway.call('filesystem.read', { path: file.path }, context);
    const artifact = call.data;
    if (artifact.secretDetected) {
      addSecretEvidence({ context, call, artifact, source: file.path, sourceType: 'local-file', toolId: 'filesystem.read', evidenceStore, graph });
      newEvidence += 1;
      secretDetected = true;
      if (pauseOnSecret) return pausedResult(file.path, files.length, newEvidence);
    }
    if (artifact.binary) continue;
    const normalized = normalizeRuntimeArtifact(file.path, artifact.content);
    const type = path.basename(file.path) === 'package.json' ? 'file' : 'system';
    const evidence = evidenceStore.add({
      taskId: context.taskId,
      agentRunId: context.agentRunId,
      type,
      source: { type: 'local-file', identifier: file.path, location: file.path },
      collector: collector('filesystem.read', call.toolCallId),
      content: { kind: 'inline', value: normalized, format: 'application/json' },
      independenceGroup: `${type}:${file.path}`,
      integrity: artifact.truncated ? 'partial' : 'captured',
      sensitivity: artifact.secretDetected ? 'confidential' : 'internal',
      redaction: artifact.redaction,
      tags: ['runtime-metadata']
    });
    graph.addEvidence(evidence);
    newEvidence += 1;
  }

  for (const file of sourceFiles) {
    const call = await gateway.call('filesystem.read', { path: file.path }, context);
    const artifact = call.data;
    if (artifact.secretDetected) {
      addSecretEvidence({ context, call, artifact, source: file.path, sourceType: 'local-file', toolId: 'filesystem.read', evidenceStore, graph });
      newEvidence += 1;
      secretDetected = true;
      if (pauseOnSecret) return pausedResult(file.path, files.length, newEvidence);
    }
    if (artifact.binary) continue;
    const analysis = analyzeSource(file.path, artifact.content);
    if (analysis.findings.length === 0) continue;
    const evidence = evidenceStore.add({
      taskId: context.taskId,
      agentRunId: context.agentRunId,
      type: 'file',
      source: { type: 'source-file', identifier: file.path, location: file.path },
      collector: collector('filesystem.read', call.toolCallId),
      content: { kind: 'inline', value: analysis, format: 'application/json' },
      independenceGroup: `source:${file.path}`,
      integrity: artifact.truncated ? 'partial' : 'captured',
      sensitivity: artifact.secretDetected ? 'confidential' : 'internal',
      redaction: artifact.redaction,
      tags: ['source-analysis', ...new Set(analysis.findings.map((finding) => finding.signal))]
    });
    graph.addEvidence(evidence);
    newEvidence += 1;
  }

  if (gateway.canCall('git.log') && gateway.git.available()) {
    const logCall = await gateway.call('git.log', { limit: 20 }, context);
    if (logCall.data.secretDetected) {
      addSecretEvidence({ context, call: logCall, artifact: logCall.data, source: 'git:history', sourceType: 'git-repository', toolId: 'git.log', evidenceStore, graph });
      newEvidence += 1;
      secretDetected = true;
      if (pauseOnSecret) return pausedResult('Git history', files.length, newEvidence);
    }
    const evidence = evidenceStore.add({
      taskId: context.taskId,
      agentRunId: context.agentRunId,
      type: 'git',
      source: { type: 'git-repository', identifier: gateway.git.workspaceRoot },
      collector: collector('git.log', logCall.toolCallId),
      content: { kind: 'inline', value: logCall.data, format: 'application/json' },
      independenceGroup: 'git:history',
      integrity: 'verified',
      sensitivity: logCall.data.secretDetected ? 'confidential' : 'internal',
      redaction: logCall.data.redaction,
      tags: ['git-history']
    });
    graph.addEvidence(evidence);
    newEvidence += 1;

    if (gateway.canCall('git.diff')) {
      const diffCall = await gateway.call('git.diff', {}, context);
      if (diffCall.data.secretDetected) {
        addSecretEvidence({ context, call: diffCall, artifact: diffCall.data, source: 'git:recent-diff', sourceType: 'git-diff', toolId: 'git.diff', evidenceStore, graph });
        newEvidence += 1;
        secretDetected = true;
        if (pauseOnSecret) return pausedResult('Git diff', files.length, newEvidence);
      }
      if (diffCall.data.available && diffCall.data.raw) {
        const diffEvidence = evidenceStore.add({
          taskId: context.taskId,
          agentRunId: context.agentRunId,
          type: 'git',
          source: { type: 'git-diff', identifier: 'HEAD~1..HEAD', location: gateway.git.workspaceRoot },
          collector: collector('git.diff', diffCall.toolCallId),
          content: { kind: 'inline', value: diffCall.data, format: 'application/json' },
          independenceGroup: 'git:recent-diff',
          integrity: 'verified',
          sensitivity: diffCall.data.secretDetected ? 'confidential' : 'internal',
          redaction: diffCall.data.redaction,
          tags: ['git-diff']
        });
        graph.addEvidence(diffEvidence);
        newEvidence += 1;
      }
    }
  }

  return {
    summary: `Collected ${newEvidence} evidence records from ${files.length} in-scope files.`,
    progressMade: newEvidence > 1,
    secretDetected,
    fileCount: files.length
  };
}

function pausedResult(source, fileCount, evidenceCount) {
  return {
    summary: `Paused collection after secret-like material was detected in ${source}.`,
    progressMade: true,
    secretDetected: true,
    fileCount,
    evidenceCount
  };
}

function addSecretEvidence({ context, call, artifact, source, sourceType, toolId, evidenceStore, graph }) {
  const evidence = evidenceStore.add({
    taskId: context.taskId,
    agentRunId: context.agentRunId,
    type: 'security',
    source: { type: sourceType, identifier: source, location: source },
    collector: collector(toolId, call.toolCallId),
    content: {
      kind: 'inline',
      value: {
        message: 'Secret-like material was detected and redacted. Raw content was not stored.',
        categories: artifact.redaction.categories,
        removedCount: artifact.redaction.removedCount
      },
      format: 'application/json'
    },
    independenceGroup: `security:${source}`,
    integrity: 'captured',
    sensitivity: 'secret-detected',
    redaction: artifact.redaction,
    tags: ['secret-detected', 'content-redacted']
  });
  graph.addEvidence(evidence);
}

function collector(toolId, toolCallId) {
  return { toolId, toolVersion: TOOL_VERSION, toolCallId };
}
