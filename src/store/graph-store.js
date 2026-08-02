import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stableId } from '../core/ids.js';

export class InvestigationGraph {
  constructor({ missionId }) {
    this.missionId = missionId;
    this.nodes = new Map();
    this.edges = new Map();
    this.addNode({ id: missionId, type: 'mission', label: missionId });
  }

  addNode(node) {
    const normalized = Object.freeze({ ...node });
    this.nodes.set(node.id, normalized);
    return normalized;
  }

  addEdge({ from, to, type, metadata = {} }) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return null;
    const id = stableId('edge', { from, to, type, metadata });
    const edge = Object.freeze({ id, from, to, type, metadata });
    this.edges.set(id, edge);
    return edge;
  }

  addEvidence(record) {
    this.addNode({
      id: record.evidenceId,
      type: 'evidence',
      label: `${record.type}:${record.source.identifier}`,
      metadata: {
        integrity: record.integrity,
        sensitivity: record.sensitivity,
        independenceGroup: record.independenceGroup
      }
    });
    this.addEdge({ from: record.evidenceId, to: this.missionId, type: 'observed-in' });
  }

  addHypothesis(hypothesis) {
    this.addNode({
      id: hypothesis.hypothesisId,
      type: 'hypothesis',
      label: hypothesis.statement,
      metadata: { status: hypothesis.status, confidence: hypothesis.confidence.score }
    });
    this.addEdge({ from: hypothesis.hypothesisId, to: this.missionId, type: 'investigates' });
    for (const evidenceId of hypothesis.supportEvidenceIds) {
      this.addEdge({ from: evidenceId, to: hypothesis.hypothesisId, type: 'supports' });
    }
    for (const evidenceId of hypothesis.contradictionEvidenceIds) {
      this.addEdge({ from: evidenceId, to: hypothesis.hypothesisId, type: 'contradicts' });
    }
  }

  updateHypothesis(hypothesis) {
    this.addNode({
      id: hypothesis.hypothesisId,
      type: 'hypothesis',
      label: hypothesis.statement,
      metadata: { status: hypothesis.status, confidence: hypothesis.confidence.score }
    });
  }

  snapshot() {
    return {
      schemaVersion: '1.0.0',
      missionId: this.missionId,
      nodes: [...this.nodes.values()],
      edges: [...this.edges.values()]
    };
  }

  async persist(outputDir) {
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, 'graph.json'), `${JSON.stringify(this.snapshot(), null, 2)}\n`, 'utf8');
  }
}
