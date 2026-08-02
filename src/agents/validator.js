import { stableId } from '../core/ids.js';

export function runValidator({ context, mission, hypotheses, evidenceStore, graph, clock }) {
  const required = mission.stopConditions.requiredIndependentValidations ?? 1;
  const validated = hypotheses.map((hypothesis) => validateOne({
    context,
    mission,
    hypothesis,
    evidenceStore,
    required,
    clock
  }));

  for (const hypothesis of validated) graph.updateHypothesis(hypothesis);

  return {
    summary: `Validated ${validated.length} hypotheses using deterministic cross-source checks.`,
    progressMade: validated.some((hypothesis) => hypothesis.validations.some((item) => item.outcome === 'supported')),
    hypotheses: validated.sort((left, right) => right.confidence.score - left.confidence.score)
  };
}

function validateOne({ context, mission, hypothesis, evidenceStore, required, clock }) {
  const support = hypothesis.supportEvidenceIds.map((id) => evidenceStore.get(id)).filter(Boolean);
  const contradictions = hypothesis.contradictionEvidenceIds.map((id) => evidenceStore.get(id)).filter(Boolean);
  const groups = new Set(support.map((record) => record.independenceGroup));
  const types = new Set(support.map((record) => record.type));
  const hasCrossSourceEvidence = groups.size >= 2 && types.size >= 2;
  const hasRequiredIndependence = groups.size >= required + 1;
  let outcome = 'inconclusive';

  if (contradictions.length > 0 && contradictions.length >= support.length) outcome = 'refuted';
  else if (hasCrossSourceEvidence && hasRequiredIndependence && hypothesis.confidence.score >= 0.6) outcome = 'supported';
  else if (support.length > 0) outcome = 'partially-supported';

  const delta = outcome === 'supported' ? 0.06 : outcome === 'partially-supported' ? 0.01 : outcome === 'refuted' ? -0.25 : -0.03;
  const score = clamp(Number((hypothesis.confidence.score + delta).toFixed(3)));
  const minimumConfidence = mission.stopConditions.minimumConfidence ?? 0.75;
  const status = outcome === 'refuted'
    ? 'refuted'
    : outcome === 'supported' && score >= minimumConfidence
      ? 'supported'
      : outcome === 'supported' || outcome === 'partially-supported'
        ? 'partially-supported'
        : 'inconclusive';
  const completedAt = clock();
  const validation = {
    validationId: stableId('val', `${hypothesis.hypothesisId}:${context.agentRunId}`),
    agentRunId: context.agentRunId,
    outcome,
    evidenceIds: support.map((record) => record.evidenceId),
    independenceGroup: 'validator:deterministic-cross-source-v1',
    rationale: `Validator found ${support.length} supporting records across ${groups.size} independent groups and ${types.size} evidence types, with ${contradictions.length} contradictions.`,
    completedAt
  };

  return {
    ...hypothesis,
    status,
    confidence: {
      ...hypothesis.confidence,
      score,
      rationale: `${hypothesis.confidence.rationale} Independent validation outcome: ${outcome}.`
    },
    validations: [...(hypothesis.validations ?? []), validation],
    updatedAt: completedAt
  };
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}
