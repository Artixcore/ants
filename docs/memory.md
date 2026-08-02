# Investigation Memory Model

Status: **Normative for Phase 2**

Ants memory is structured, scoped, and provenance-aware. It is not an unlimited transcript and it does not allow unverified conclusions from one mission to become facts in another.

## 1. Memory layers

### Working memory

Short-lived task context used by one agent run.

Contains:

- task objective;
- selected evidence summaries or references;
- tool definitions;
- role instructions;
- budget and policy context.

Working memory expires with the agent run unless specific outputs are persisted.

### Mission memory

Durable state for one investigation.

Contains:

- mission versions;
- tasks and agent runs;
- evidence;
- findings and hypotheses;
- graph edges;
- validations;
- action plans and approvals;
- audit events;
- final reports.

Mission memory is the authoritative context for reporting and replay.

### Historical memory

Curated, cross-mission knowledge such as verified incident patterns, approved runbooks, resource topology, and resolved failure signatures.

Historical memory is opt-in and MUST preserve source mission references, validation status, retention rules, and tenant boundaries.

### Static knowledge

Versioned project documentation, schemas, policies, tool definitions, and provider capabilities. Static knowledge is maintained as code or controlled configuration.

## 2. What must not become memory

The system MUST NOT persist as normal memory:

- raw secrets;
- unrestricted credentials;
- hidden model reasoning;
- unverified model claims presented as facts;
- sensitive data outside mission policy;
- entire external documents when a bounded reference is sufficient;
- data from another tenant without explicit authorization.

## 3. Context assembly

Context is assembled for each task rather than inherited from a long conversation.

The context builder MUST:

1. identify the task objective and role;
2. retrieve only relevant mission records;
3. prefer evidence references over copied raw artifacts;
4. preserve provenance and sensitivity labels;
5. include material contradictions;
6. enforce provider data policy;
7. cap tokens and bytes;
8. record which context items were provided.

Context selection MAY use lexical, graph, temporal, or vector retrieval. Retrieval scores do not replace authorization or provenance.

## 4. Summaries

Summaries are derived records and MUST reference their source records.

A summary MUST record:

- summarizer identity and version;
- parent record IDs;
- creation time;
- truncation and omission notes;
- sensitivity classification;
- content hash;
- whether a model generated it.

A summary cannot be used to claim source independence from its parents.

## 5. Historical promotion

Mission knowledge may enter historical memory only when:

- the mission is terminal;
- evidence provenance is intact;
- relevant hypotheses have validation outcomes;
- sensitive content is removed or protected;
- retention policy permits promotion;
- an authorized policy or reviewer approves promotion;
- the historical record includes confidence and applicability conditions.

Example historical record:

```json
{
  "patternId": "pattern-node-image-buffer-growth-v1",
  "statement": "Unbounded image decoding can cause rapid Node.js memory growth before process termination.",
  "sourceMissionIds": ["mis_01JLOCALNODEFAILURE"],
  "validationStatus": "reproduced",
  "applicability": ["nodejs", "image-processing", "memory-growth"],
  "limitations": ["Does not prove the same cause in a new mission"],
  "approvedAt": "2026-08-02T20:00:00Z"
}
```

Historical patterns are leads, not evidence for a new mission.

## 6. Retrieval rules

Historical memory retrieval MUST:

- respect tenant and project boundaries;
- state why the record matched;
- include source and validation metadata;
- avoid presenting the record as current evidence;
- allow the investigator to ignore or challenge it;
- record the retrieval in the audit trail.

## 7. Retention and deletion

Retention SHOULD be configurable by record type and sensitivity.

Possible defaults:

- agent working context: delete after task completion;
- provider raw responses: short retention or disabled;
- normal evidence: mission retention policy;
- quarantined secrets: do not retain the secret value;
- audit metadata: longer retention;
- historical patterns: versioned until revoked or expired.

Deletion MUST create an audit event. Where an artifact is deleted, Ants MAY retain a hash and metadata sufficient to explain that it existed and was removed.

## 8. Revocation and invalidation

Historical records MUST be revocable when:

- source evidence is invalidated;
- the pattern is discovered to be unsafe or misleading;
- policy changes;
- retention expires;
- a tenant requests authorized deletion;
- a superseding record replaces it.

Revocation does not silently erase prior use. Missions that consumed the record SHOULD retain the retrieval event and revocation status.

## 9. Vector storage

Vector embeddings MAY improve retrieval, but they are indexes, not authoritative memory.

Embeddings MUST:

- inherit access controls and sensitivity labels;
- identify embedding model and version;
- be deleted when the source record is deleted where required;
- not contain raw secrets;
- not cross tenant boundaries by default.

## 10. Memory invariants

1. Mission memory is isolated by default.
2. Evidence provenance survives summarization.
3. Historical memory provides leads, not proof.
4. Context is assembled per task and recorded.
5. Secrets are not normal memory.
6. Retrieval never bypasses authorization.
7. Invalidated knowledge is visibly revoked.
8. Storage technology does not change the logical contracts.
