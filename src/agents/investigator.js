import { stableId } from '../core/ids.js';

const DETECTORS = [
  {
    id: 'node-memory-exhaustion',
    statement: 'The Node.js process crashed because upload processing exhausted the JavaScript heap through full-file buffering, copying, or retained buffers.',
    logSignals: ['node-heap-oom', 'memory-pressure', 'fatal'],
    sourceSignals: ['full-file-buffer', 'buffer-copy', 'retained-buffer'],
    gitPatterns: [/readFile/i, /Buffer\.(?:from|alloc|concat)/i, /\.push\(/i],
    runtime: memoryRuntimeScore,
    predictions: [
      'Fatal logs mention the JavaScript heap or allocation failure.',
      'Runtime diagnostics show heap use close to the configured heap limit.',
      'Source or a recent diff reads full uploads into memory, copies buffers, or retains them.'
    ],
    falsification: [
      'Heap usage remained low immediately before the crash.',
      'The process terminated for an unrelated signal with no memory-pressure evidence.',
      'The implicated path streams data with bounded backpressure and does not retain buffers.'
    ],
    remediation: [
      'Stream uploads instead of reading the entire file into memory.',
      'Remove unnecessary Buffer copies and unbounded in-memory retention.',
      'Add upload-size limits and memory-pressure telemetry.',
      'Reproduce in staging before changing production memory limits.'
    ]
  },
  {
    id: 'port-conflict',
    statement: 'The service failed because its listening port was already occupied by another process.',
    logSignals: ['address-in-use'],
    sourceSignals: [],
    gitPatterns: [/listen\s*\(/i],
    predictions: ['Logs contain EADDRINUSE or an equivalent address-in-use error.'],
    falsification: ['The service bound successfully before the failure.'],
    remediation: ['Identify the port owner and correct service or deployment configuration.']
  },
  {
    id: 'disk-exhaustion',
    statement: 'The service failed because the local filesystem had insufficient free space.',
    logSignals: ['disk-full'],
    sourceSignals: [],
    gitPatterns: [],
    predictions: ['Logs contain ENOSPC or no-space-left errors.'],
    falsification: ['Filesystem diagnostics show adequate free space at failure time.'],
    remediation: ['Free disk space, cap logs, and add filesystem alerts.']
  },
  {
    id: 'unhandled-runtime-error',
    statement: 'The service terminated after an unhandled application error or rejected promise.',
    logSignals: ['unhandled-error', 'error'],
    sourceSignals: ['process-exit'],
    gitPatterns: [],
    predictions: ['Logs contain an uncaught exception, unhandled rejection, or terminal stack trace.'],
    falsification: ['The process was terminated externally without an application exception.'],
    remediation: ['Fix the originating error and add explicit error boundaries and rejection handling.']
  },
  {
    id: 'missing-dependency',
    statement: 'The service failed during startup because a required Node.js module could not be resolved.',
    logSignals: ['module-not-found'],
    sourceSignals: [],
    gitPatterns: [/package\.json/i],
    predictions: ['Logs contain MODULE_NOT_FOUND or cannot-find-module errors.'],
    falsification: ['All required modules resolve successfully in the failing environment.'],
    remediation: ['Correct dependency declarations and use reproducible npm installs.']
  }
];

export function runInvestigator({ context, mission, evidenceStore, graph, clock }) {
  const evidence = evidenceStore.all();
  const hypotheses = DETECTORS.map((detector) => buildHypothesis(detector, {
    context,
    mission,
    evidence,
    clock
  }))
    .filter((hypothesis) => hypothesis.supportEvidenceIds.length > 0)
    .sort((left, right) => right.confidence.score - left.confidence.score);

  if (hypotheses.length === 0) {
    hypotheses.push(buildFallbackHypothesis({ context, mission, evidence, clock }));
  }

  for (const hypothesis of hypotheses) graph.addHypothesis(hypothesis);

  return {
    summary: `Generated ${hypotheses.length} ranked hypotheses.`,
    progressMade: hypotheses.some((hypothesis) => hypothesis.supportEvidenceIds.length > 0),
    hypotheses
  };
}

function buildHypothesis(detector, { context, mission, evidence, clock }) {
  const support = [];
  const contradictions = [];
  let matchWeight = 0;

  for (const record of evidence) {
    const value = record.content?.value;
    if (record.type === 'log') {
      const matching = value?.matches?.filter((match) => detector.logSignals.includes(match.signal)) ?? [];
      if (matching.length > 0) {
        support.push(record);
        matchWeight += Math.min(1, matching.length / 2);
      }
    }
    if (record.source?.type === 'source-file') {
      const matching = value?.findings?.filter((finding) => detector.sourceSignals.includes(finding.signal)) ?? [];
      if (matching.length > 0) {
        support.push(record);
        matchWeight += Math.min(1, matching.length / 2);
      }
    }
    if (record.type === 'git' && record.source.type === 'git-diff') {
      const raw = value?.raw ?? '';
      const matches = detector.gitPatterns.filter((pattern) => pattern.test(raw));
      if (matches.length > 0) {
        support.push(record);
        matchWeight += Math.min(1, matches.length / 2);
      }
    }
    if (record.type === 'system' && detector.runtime) {
      const runtimeResult = detector.runtime(value?.data ?? {});
      if (runtimeResult.supports) {
        support.push(record);
        matchWeight += runtimeResult.weight;
      } else if (runtimeResult.contradicts) {
        contradictions.push(record);
      }
    }
  }

  const uniqueSupport = uniqueById(support);
  const uniqueContradictions = uniqueById(contradictions);
  const groups = [...new Set(uniqueSupport.map((record) => record.independenceGroup))];
  const evidenceStrength = weightedReliability(uniqueSupport);
  const independence = Math.min(1, groups.length / 3);
  const temporalRelevance = uniqueSupport.length > 0 ? 0.9 : 0;
  const coverage = Math.min(1, matchWeight / 3);
  const contradictionPenalty = Math.min(1, uniqueContradictions.length / 2);
  const rawScore = 0.38 * evidenceStrength + 0.27 * independence + 0.18 * coverage + 0.12 * temporalRelevance - 0.3 * contradictionPenalty;
  const score = clamp(Number(rawScore.toFixed(3)));
  const minimumConfidence = mission.stopConditions.minimumConfidence ?? 0.75;
  const status = score >= minimumConfidence && groups.length >= mission.stopConditions.requiredIndependentValidations + 1
    ? 'validation-required'
    : score >= 0.45
      ? 'partially-supported'
      : 'inconclusive';
  const now = clock();

  return {
    schemaVersion: '1.0.0',
    hypothesisId: stableId('hyp', `${mission.missionId}:${detector.id}`),
    missionId: mission.missionId,
    statement: detector.statement,
    status,
    proposedBy: { taskId: context.taskId, agentRunId: context.agentRunId },
    supportEvidenceIds: uniqueSupport.map((record) => record.evidenceId),
    contradictionEvidenceIds: uniqueContradictions.map((record) => record.evidenceId),
    independenceGroups: groups,
    confidence: {
      score,
      rationale: rationale(detector.id, uniqueSupport.length, groups.length, uniqueContradictions.length),
      factors: {
        evidenceStrength,
        independence,
        reproduction: 0,
        temporalRelevance,
        coverage,
        contradictionPenalty
      }
    },
    predictedObservations: detector.predictions,
    falsificationCriteria: detector.falsification,
    missingEvidence: missingEvidence(detector.id, uniqueSupport),
    validations: [],
    affectedEntityIds: [...new Set(uniqueSupport.map((record) => record.source.identifier))],
    createdAt: now,
    updatedAt: now
  };
}

function buildFallbackHypothesis({ context, mission, evidence, clock }) {
  const now = clock();
  return {
    schemaVersion: '1.0.0',
    hypothesisId: stableId('hyp', `${mission.missionId}:insufficient-evidence`),
    missionId: mission.missionId,
    statement: 'The available local artifacts are insufficient to identify a defensible root cause.',
    status: 'inconclusive',
    proposedBy: { taskId: context.taskId, agentRunId: context.agentRunId },
    supportEvidenceIds: evidence.map((record) => record.evidenceId),
    contradictionEvidenceIds: [],
    independenceGroups: [...new Set(evidence.map((record) => record.independenceGroup))],
    confidence: {
      score: 0.2,
      rationale: 'No detector found a sufficiently specific combination of log, runtime, source, or Git evidence.',
      factors: { evidenceStrength: 0.2, independence: 0.2, reproduction: 0, temporalRelevance: 0.5, coverage: 0.1, contradictionPenalty: 0 }
    },
    predictedObservations: [],
    falsificationCriteria: [],
    missingEvidence: ['Collect failure-time logs, runtime diagnostics, relevant source code, and recent Git changes.'],
    validations: [],
    affectedEntityIds: [],
    createdAt: now,
    updatedAt: now
  };
}

function memoryRuntimeScore(data) {
  const heapUsed = numberFrom(data, ['heapUsedMb', 'heapUsed', 'memory.heapUsedMb']);
  const heapLimit = numberFrom(data, ['heapLimitMb', 'heapLimit', 'memory.heapLimitMb']);
  const exitCode = numberFrom(data, ['exitCode']);
  const signal = String(data.signal ?? '');

  if (heapUsed !== null && heapLimit !== null && heapLimit > 0) {
    const ratio = heapUsed / heapLimit;
    if (ratio >= 0.85) return { supports: true, weight: Math.min(1, ratio) };
    if (ratio <= 0.4 && exitCode === 0 && !/ABRT|KILL/i.test(signal)) return { contradicts: true, weight: 0.5 };
  }
  return { supports: false, contradicts: false, weight: 0 };
}

function numberFrom(object, paths) {
  for (const candidate of paths) {
    const value = candidate.split('.').reduce((current, key) => current?.[key], object);
    if (Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function weightedReliability(records) {
  if (records.length === 0) return 0;
  return Number((records.reduce((sum, record) => sum + (record.sourceReliability?.score ?? 0.5), 0) / records.length).toFixed(3));
}

function uniqueById(records) {
  return [...new Map(records.map((record) => [record.evidenceId, record])).values()];
}

function missingEvidence(detectorId, support) {
  const types = new Set(support.map((record) => record.type));
  const missing = [];
  if (!types.has('log')) missing.push('Failure-time logs that contain the terminal error or signal.');
  if (!types.has('system')) missing.push('Runtime or system diagnostics captured near the failure.');
  if (!support.some((record) => record.source.type === 'source-file')) missing.push('Relevant source-path evidence.');
  if (!types.has('git')) missing.push('Recent Git history or a diff correlated with the incident.');
  if (detectorId === 'node-memory-exhaustion') missing.push('A controlled reproduction or heap profile would raise confidence further.');
  return missing;
}

function rationale(detectorId, supportCount, groupCount, contradictionCount) {
  return `${detectorId} matched ${supportCount} evidence records across ${groupCount} independent groups with ${contradictionCount} recorded contradictions. The score is a deterministic heuristic, not a model probability.`;
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}
