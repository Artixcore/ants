import path from 'node:path';
import { stableHash, stableId } from '../core/ids.js';
import { atomicWriteText } from '../security/safe-write.js';

export class EvidenceStore {
  constructor({ missionId, clock }) {
    this.missionId = missionId;
    this.clock = clock;
    this.records = [];
    this.byId = new Map();
  }

  add(input) {
    assertEvidenceInput(input);
    const content = structuredClone(input.content ?? { kind: 'inline', value: null });
    const identity = {
      missionId: this.missionId,
      type: input.type,
      source: input.source,
      content,
      independenceGroup: input.independenceGroup
    };
    const evidenceId = input.evidenceId ?? stableId('ev', identity);
    if (this.byId.has(evidenceId)) return this.byId.get(evidenceId);

    const record = deepFreeze({
      schemaVersion: '1.0.0',
      evidenceId,
      missionId: this.missionId,
      taskId: input.taskId,
      agentRunId: input.agentRunId,
      type: input.type,
      source: structuredClone(input.source),
      collector: structuredClone(input.collector),
      collectedAt: input.collectedAt ?? this.clock(),
      ...(input.observedAt ? { observedAt: input.observedAt } : {}),
      content,
      contentHash: { algorithm: 'sha256', value: stableHash(content) },
      integrity: input.integrity ?? 'captured',
      sensitivity: input.sensitivity ?? 'internal',
      independenceGroup: input.independenceGroup,
      sourceReliability: structuredClone(input.sourceReliability ?? {
        score: 0.8,
        rationale: 'Collected directly by a bounded local read-only tool.'
      }),
      ...(input.parentEvidenceIds?.length ? { parentEvidenceIds: [...input.parentEvidenceIds] } : {}),
      ...(input.transformation ? { transformation: structuredClone(input.transformation) } : {}),
      ...(input.redaction ? { redaction: structuredClone(input.redaction) } : {}),
      ...(input.tags?.length ? { tags: [...new Set(input.tags)].sort() } : {})
    });

    this.records.push(record);
    this.byId.set(evidenceId, record);
    return record;
  }

  get(evidenceId) {
    return this.byId.get(evidenceId) ?? null;
  }

  all() {
    return [...this.records];
  }

  find(predicate) {
    return this.records.filter(predicate);
  }

  hasSecretDetection() {
    return this.records.some((record) => record.sensitivity === 'secret-detected');
  }

  async persist(outputDir) {
    const jsonl = this.records.map((record) => JSON.stringify(record)).join('\n');
    await atomicWriteText(path.join(outputDir, 'evidence.jsonl'), `${jsonl}${jsonl ? '\n' : ''}`);
  }
}

function assertEvidenceInput(input) {
  if (!input || typeof input !== 'object') throw new TypeError('Evidence input must be an object.');
  for (const key of ['taskId', 'agentRunId', 'type', 'source', 'collector', 'independenceGroup']) {
    if (input[key] === undefined || input[key] === null) throw new TypeError(`Evidence input is missing ${key}.`);
  }
  if (typeof input.independenceGroup !== 'string' || input.independenceGroup.length === 0) {
    throw new TypeError('Evidence independenceGroup must be a non-empty string.');
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
