# Internal Events and API Contracts

Status: **Normative for Phase 2**

Ants components communicate through versioned command, query, and event envelopes. The first implementation may use in-process function calls, but it must preserve these logical contracts so components can later move to separate processes or services.

## 1. Contract principles

All messages MUST:

- use UTF-8 JSON-compatible data;
- include a schema version;
- include a unique message ID;
- include mission and correlation identifiers where applicable;
- include a creation timestamp in UTC;
- identify the producer;
- avoid raw secrets;
- be validated before state mutation;
- remain backward-compatible within a supported version range or fail explicitly.

## 2. Envelope

```json
{
  "schemaVersion": "1.0.0",
  "messageId": "msg_01JEXAMPLE",
  "messageType": "task.created",
  "missionId": "mis_01JEXAMPLE",
  "correlationId": "trace_01JEXAMPLE",
  "causationId": "msg_01JPARENT",
  "producer": {
    "component": "mission-controller",
    "version": "0.2.0"
  },
  "createdAt": "2026-08-02T19:00:00Z",
  "payload": {}
}
```

`causationId` identifies the command or event that directly caused the message. `correlationId` links the broader operation.

## 3. Commands

Commands request a state change or operation. They use imperative names.

Initial commands include:

- `mission.validate`;
- `mission.start`;
- `mission.pause`;
- `mission.resume`;
- `mission.cancel`;
- `task.create`;
- `task.lease`;
- `task.complete`;
- `task.fail`;
- `tool.authorize`;
- `tool.execute`;
- `hypothesis.propose`;
- `hypothesis.update`;
- `validation.request`;
- `approval.request`;
- `approval.decide`;
- `report.generate`.

A command handler MUST return a typed acceptance or rejection result. Rejection MUST include a stable reason code.

## 4. Events

Events state facts that have occurred. They use past-tense names and are append-only at the logical level.

Initial events include:

### Mission events

- `mission.created`;
- `mission.validated`;
- `mission.rejected`;
- `mission.started`;
- `mission.paused`;
- `mission.resumed`;
- `mission.cancelled`;
- `mission.budget-exhausted`;
- `mission.failed`;
- `mission.completed`;
- `mission.amended`.

### Task events

- `task.created`;
- `task.leased`;
- `task.started`;
- `task.completed`;
- `task.blocked`;
- `task.failed`;
- `task.retry-scheduled`;
- `task.lease-expired`.

### Tool events

- `tool.authorization-allowed`;
- `tool.authorization-denied`;
- `tool.approval-required`;
- `tool.started`;
- `tool.completed`;
- `tool.failed`;
- `tool.sandbox-violation`.

### Investigation events

- `evidence.created`;
- `evidence.invalidated`;
- `finding.created`;
- `finding.superseded`;
- `hypothesis.proposed`;
- `hypothesis.updated`;
- `contradiction.recorded`;
- `validation.completed`;
- `pheromone.updated`.

### Approval and action events

- `approval.requested`;
- `approval.granted`;
- `approval.denied`;
- `approval.expired`;
- `action.started`;
- `action.completed`;
- `action.failed`;
- `action.rolled-back`;
- `action.verified`.

### Provider events

- `provider.requested`;
- `provider.responded`;
- `provider.failed`;
- `provider.fallback-selected`;
- `provider.budget-denied`.

## 5. Queries

Queries retrieve state without mutation.

Initial logical queries include:

- `getMission(missionId)`;
- `listTasks(missionId, filters)`;
- `getEvidence(evidenceId)`;
- `listEvidence(missionId, filters)`;
- `getHypothesis(hypothesisId)`;
- `listHypotheses(missionId)`;
- `getInvestigationTimeline(missionId)`;
- `getGraphNeighborhood(nodeId, depth)`;
- `getBudgetUsage(missionId)`;
- `getAuditEvents(missionId, cursor)`;
- `getFinalReport(missionId)`.

Queries MUST apply authorization and sensitivity filtering. Read-only does not mean unrestricted.

## 6. Task result contract

An agent task result SHOULD contain:

```json
{
  "schemaVersion": "1.0.0",
  "taskId": "task_01JEXAMPLE",
  "agentRunId": "run_01JEXAMPLE",
  "status": "completed",
  "summary": "The process was terminated after sustained memory growth.",
  "observations": [],
  "inferences": [],
  "evidenceIds": [],
  "hypothesisProposals": [],
  "contradictions": [],
  "followUpTaskProposals": [],
  "limitations": [],
  "usage": {
    "toolCalls": 3,
    "modelTokens": 4200
  },
  "completedAt": "2026-08-02T19:05:00Z"
}
```

Task results are rejected when the task lease is stale, the schema is invalid, or referenced evidence belongs to another unauthorized mission.

## 7. Error contract

Errors SHOULD contain:

- stable code;
- category;
- safe message;
- retryable flag;
- relevant resource reference;
- cause reference for internal logs;
- timestamp;
- correlation ID.

Raw stack traces, credentials, provider response bodies, and sensitive resource details MUST NOT be returned across trust boundaries by default.

Example codes:

- `ANTS_SCHEMA_INVALID`;
- `ANTS_SCOPE_DENIED`;
- `ANTS_PERMISSION_DENIED`;
- `ANTS_APPROVAL_REQUIRED`;
- `ANTS_APPROVAL_INVALID`;
- `ANTS_BUDGET_EXHAUSTED`;
- `ANTS_TASK_LEASE_STALE`;
- `ANTS_TOOL_TIMEOUT`;
- `ANTS_PROVIDER_RATE_LIMITED`;
- `ANTS_SECRET_DETECTED`;
- `ANTS_SANDBOX_VIOLATION`.

## 8. Versioning

Schemas use semantic versions.

- Patch versions clarify validation without changing valid meaning.
- Minor versions add backward-compatible optional fields or values.
- Major versions introduce incompatible changes.

Persisted records MUST retain the schema version they were created with. Readers SHOULD support migration or explicit rejection.

## 9. Event delivery

The logical delivery guarantee is at-least-once.

Consumers MUST:

- deduplicate by message ID;
- process mutations idempotently;
- preserve ordering per mission where required;
- detect causation cycles;
- reject events from unsupported schema versions;
- record consumer failures.

## 10. In-process implementation

Phase 3 MAY implement commands as functions and events as append-only JSON records.

Even in-process code SHOULD:

- validate envelopes;
- avoid passing mutable shared state;
- emit audit events;
- preserve IDs and causation;
- keep component interfaces asynchronous where external work may later occur.

## 11. External API boundary

A future public API SHOULD expose mission operations rather than internal worker controls.

Potential endpoints include:

```text
POST   /v1/missions
GET    /v1/missions/{missionId}
POST   /v1/missions/{missionId}/start
POST   /v1/missions/{missionId}/cancel
GET    /v1/missions/{missionId}/evidence
GET    /v1/missions/{missionId}/hypotheses
GET    /v1/missions/{missionId}/report
POST   /v1/approvals/{approvalId}/decision
```

External APIs MUST have authentication, tenant isolation, rate limits, idempotency, and audit controls before implementation.

## 12. Contract invariants

1. Messages are versioned and validated.
2. Events state facts and are append-only.
3. Commands can be rejected with stable reason codes.
4. At-least-once delivery requires idempotent consumers.
5. Queries enforce authorization and redaction.
6. Component boundaries remain valid in-process and distributed.
7. Public APIs do not expose unrestricted worker or tool execution.
