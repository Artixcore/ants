import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stableHash, stableId } from '../core/ids.js';

export class EvidenceStore {
  constructor({ missionId, clock }) {
    this.missionId = missionId;
    this.clock = clock;
    this.records = [];
    this.byId = new Map();
  }

  add(input) {
    const content = input.content ?? { kind: 'inline', value: null };
    const identity = {
      missionId: this.missionId,
      type: input.type,
      source: input.source,
      content,
      independenceGroup: input.independenceGroup
    };
    const evidenceId = input.evidenceId ?? stableId('ev', identity);
    if (this.byId.has(evidenceId)) return this.byId.get(evidenceId);

    const record = Object.freeze({
      schemaVersion: '1.0.0',
      evidenceId,
      missionId: this.missionId,
      taskId: input.taskId,
      agentRunId: input.agentRunId,
      type: input.type,
      source: input.source,
      collector: input.collector,
      collectedAt: input.collectedAt ?? this.clock(),
      ...(input.observedAt ? { observedAt: input.observedAt } : {}),
      content,
      contentHash: { algorithm: 'sha256', value: stableHash(content) },
      integrity: input.integrity ?? 'captured',
      sensitivity: input.sensitivity ?? 'internal',
      independenceGroup: input.independenceGroup,
      sourceReliability: input.sourceReliability ?? {
        score: 0.8,
        rationale: 'Collected directly by a bounded local read-only tool.'
      },
      ...(input.parentEvidenceIds?.length ? { parentEvidenceIds: [...input.parentEvidenceIds] } : {}),
      ...(input.transformation ? { transformation: input.transformation } : {}),
      ...(input.redaction ? { redaction: input.redaction } : {}),
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
    await mkdir(outputDir, { recursive: true });
    const jsonl = this.records.map((record) => JSON.stringify(record)).join('\n');
    await writeFile(path.join(outputDir, 'evidence.jsonl'), `${jsonl}${jsonl ? '\n' : ''}`, 'utf8');
  }
}
