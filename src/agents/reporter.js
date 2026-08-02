import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function runReporter({
  context,
  mission,
  hypotheses,
  evidenceStore,
  graph,
  scheduler,
  gateway,
  budget,
  outputDir,
  clock,
  forcedStatus = null,
  executionErrors = []
}) {
  const primary = hypotheses[0] ?? null;
  const minimumConfidence = mission.stopConditions.minimumConfidence ?? 0.75;
  const status = forcedStatus ?? (
    primary?.status === 'supported' && primary.confidence.score >= minimumConfidence
      ? 'completed'
      : 'partial'
  );
  const limitations = buildLimitations({ mission, primary, evidenceStore, gateway, status });
  const report = {
    schemaVersion: '1.0.0',
    engineVersion: '0.3.0',
    mission: {
      missionId: mission.missionId,
      title: mission.title,
      objective: mission.objective,
      mode: mission.mode,
      environment: mission.scope.environment
    },
    status,
    generatedAt: clock(),
    summary: summaryFor(primary, status),
    primaryHypothesisId: primary?.hypothesisId ?? null,
    hypotheses,
    recommendations: recommendationsFor(primary),
    evidenceIndex: mission.reporting.includeEvidenceIndex
      ? evidenceStore.all().map((record) => evidenceIndexEntry(record))
      : [],
    graph: graph.snapshot(),
    tasks: scheduler.snapshot().map((task) => task.taskId === context.taskId
      ? { ...task, status: 'completed', completedAt: clock() }
      : task),
    audit: gateway.snapshot(),
    budget: budget.snapshot(),
    executionErrors,
    limitations: [...limitations, ...executionErrors.map((error) => `Execution error ${error.code}: ${error.message}`)],
    safety: {
      readOnly: true,
      mutationsAttempted: 0,
      secretDetected: evidenceStore.hasSecretDetection()
    }
  };

  await mkdir(outputDir, { recursive: true });
  await evidenceStore.persist(outputDir);
  await graph.persist(outputDir);
  await atomicJson(path.join(outputDir, 'hypotheses.json'), hypotheses);

  if (['json', 'markdown+json'].includes(mission.reporting.format)) {
    await atomicJson(path.join(outputDir, 'report.json'), report);
  }
  if (['markdown', 'markdown+json'].includes(mission.reporting.format)) {
    await atomicText(path.join(outputDir, 'report.md'), toMarkdown(report, mission));
  }
  await atomicJson(path.join(outputDir, 'audit.json'), gateway.snapshot());

  return {
    summary: `Wrote ${mission.reporting.format} investigation report to ${outputDir}.`,
    progressMade: true,
    report,
    outputDir,
    taskId: context.taskId
  };
}

function recommendationsFor(primary) {
  if (!primary) return [];
  const statement = primary.statement.toLowerCase();
  if (statement.includes('javascript heap') || statement.includes('buffer')) {
    return [
      'Stream uploads instead of reading the entire file into memory.',
      'Remove unnecessary Buffer copies and unbounded in-memory retention.',
      'Add upload-size limits and memory-pressure telemetry.',
      'Reproduce in staging before changing production memory limits.'
    ];
  }
  if (statement.includes('listening port')) return ['Identify the port owner and correct service or deployment configuration.'];
  if (statement.includes('filesystem')) return ['Free disk space, cap logs, and add filesystem alerts.'];
  if (statement.includes('unhandled')) return ['Fix the originating error and add explicit error boundaries and rejection handling.'];
  if (statement.includes('module')) return ['Correct dependency declarations and use reproducible npm installs.'];
  return ['Collect more evidence before taking corrective action.'];
}

function summaryFor(primary, status) {
  if (status === 'paused') return 'The mission paused after potential secret material was detected and redacted.';
  if (!primary) return 'No hypothesis could be produced from the available evidence.';
  return `${primary.statement} Confidence ${Math.round(primary.confidence.score * 100)}%; status ${primary.status}.`;
}

function buildLimitations({ mission, primary, evidenceStore, gateway, status }) {
  const limitations = [];
  if (!gateway.git.available()) limitations.push('No isolated .git directory was present in the workspace, so Git history could not be inspected.');
  if (!evidenceStore.find((record) => record.type === 'system').length) limitations.push('No structured runtime or system diagnostic artifact was collected.');
  if (!primary || primary.status !== 'supported') limitations.push('The leading hypothesis did not meet the configured support and confidence thresholds.');
  if (primary?.missingEvidence?.length) limitations.push(...primary.missingEvidence);
  if (status === 'paused') limitations.push('Potential secret material was detected; the affected content was redacted and deeper investigation stopped.');
  limitations.push('Confidence values are deterministic engineering heuristics, not statistical probabilities.');
  limitations.push(`The mission was constrained to ${mission.mode} local analysis and performed no operational remediation.`);
  return [...new Set(limitations)];
}

function evidenceIndexEntry(record) {
  return {
    evidenceId: record.evidenceId,
    type: record.type,
    source: record.source,
    integrity: record.integrity,
    sensitivity: record.sensitivity,
    independenceGroup: record.independenceGroup,
    tags: record.tags ?? []
  };
}

function toMarkdown(report, mission) {
  const primary = report.hypotheses.find((item) => item.hypothesisId === report.primaryHypothesisId);
  const lines = [
    `# Ants Incident Investigation`,
    '',
    `**Mission:** ${escapeMarkdown(mission.title)}`,
    `**Mission ID:** \`${mission.missionId}\``,
    `**Status:** ${report.status}`,
    `**Generated:** ${report.generatedAt}`,
    '',
    '## Executive summary',
    '',
    report.summary,
    ''
  ];

  if (primary) {
    lines.push(
      '## Leading hypothesis',
      '',
      primary.statement,
      '',
      `- **Confidence:** ${Math.round(primary.confidence.score * 100)}%`,
      `- **Validation status:** ${primary.status}`,
      `- **Independent evidence groups:** ${primary.independenceGroups.length}`,
      `- **Supporting evidence records:** ${primary.supportEvidenceIds.length}`,
      `- **Contradictions:** ${primary.contradictionEvidenceIds.length}`,
      '',
      primary.confidence.rationale,
      ''
    );
  }

  lines.push('## Ranked hypotheses', '');
  for (const [index, hypothesis] of report.hypotheses.entries()) {
    lines.push(
      `${index + 1}. **${Math.round(hypothesis.confidence.score * 100)}%** - ${hypothesis.statement}`,
      `   - Status: ${hypothesis.status}`,
      `   - Evidence: ${hypothesis.supportEvidenceIds.join(', ') || 'none'}`,
      `   - Contradictions: ${hypothesis.contradictionEvidenceIds.join(', ') || 'none'}`
    );
  }
  lines.push('');

  lines.push('## Recommended actions', '');
  if (report.recommendations.length === 0) lines.push('- Collect more evidence before acting.');
  else for (const recommendation of report.recommendations) lines.push(`- ${recommendation}`);
  lines.push('');

  if (mission.reporting.includeEvidenceIndex) {
    lines.push('## Evidence index', '', '| ID | Type | Source | Integrity | Independence |', '| --- | --- | --- | --- | --- |');
    for (const item of report.evidenceIndex) {
      lines.push(`| \`${item.evidenceId}\` | ${item.type} | ${escapePipe(item.source.identifier)} | ${item.integrity} | ${escapePipe(item.independenceGroup)} |`);
    }
    lines.push('');
  }

  if (mission.reporting.includeLimitations) {
    lines.push('## Limitations', '');
    for (const limitation of report.limitations) lines.push(`- ${limitation}`);
    lines.push('');
  }

  lines.push('## Safety statement', '', 'This Phase 3 run was read-only. Ants did not execute remediation or contact external services. It wrote only the report artifacts listed above and did not mutate in-scope evidence files.', '');
  return `${lines.join('\n')}\n`;
}

async function atomicJson(filePath, value) {
  await atomicText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function atomicText(filePath, value) {
  const tempPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(tempPath, value, 'utf8');
  await rename(tempPath, filePath);
}

function escapeMarkdown(value) {
  return String(value).replace(/[\\`*_{}[\]()#+.!|-]/g, '\\$&');
}

function escapePipe(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}
