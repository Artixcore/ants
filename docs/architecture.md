# Ants Architecture Specification

Status: **Normative for Phase 2**

Version: **0.2.0**

Ants is an evidence-driven, multi-agent investigation system for cloud operations, DevOps, SRE, security, and codebase analysis. This document defines the system boundaries, component model, trust boundaries, data flow, execution model, and non-negotiable safety invariants.

The words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** describe requirement strength.

## 1. Goals

Ants is designed to:

- investigate technical failures using multiple bounded specialist agents;
- preserve evidence provenance and distinguish observation from inference;
- rank competing hypotheses instead of forcing premature consensus;
- operate read-only by default;
- support local, repository, CI/CD, and cloud investigations through adapters;
- remain provider-neutral across language models and infrastructure vendors;
- produce an auditable report that explains what was examined, what was concluded, and what remains uncertain;
- require explicit approval before any action with meaningful side effects.

## 2. Non-goals

Phase 2 does not define Ants as:

- a fully autonomous production operator;
- a general-purpose chatbot;
- an unrestricted shell agent;
- a substitute for incident commanders, security teams, or cloud account owners;
- a system that treats model confidence as proof;
- a system that hides contradictory evidence;
- a system that grants every agent access to every tool.

## 3. Architectural style

Ants uses a modular control-plane architecture with structured messages and durable investigation state.

The first implementation SHOULD run as a single Node.js process with isolated modules. The architecture MUST allow later extraction of workers into separate processes or services without changing the mission, evidence, hypothesis, tool, or provider contracts.

```text
User or Trigger
      |
      v
Mission Intake and Policy Validation
      |
      v
Mission Controller
      |
      +-----------------------+
      |                       |
      v                       v
Task Scheduler          Security Guard
      |
      v
Agent Workers
 Scout | Investigator | Validator | Reporter
      |
      v
Tool Gateway ---- Provider Adapters
      |                    |
      v                    v
External Systems      Model Providers
      |
      v
Evidence Store and Investigation Graph
      |
      v
Report and Approval Gateway
```

## 4. Core components

### 4.1 Mission Intake

Mission Intake accepts a mission document, validates it against `schemas/mission.schema.json`, resolves defaults, and rejects unsafe or ambiguous permissions.

It MUST:

- assign or validate a globally unique mission identifier;
- normalize timestamps to UTC;
- verify budgets and stop conditions;
- reject unknown tool permissions unless explicitly allowed by policy;
- attach the active policy version;
- prevent a mission from beginning with broader permissions than requested.

### 4.2 Mission Controller

The Mission Controller owns the mission lifecycle. It does not perform specialist investigation work itself.

It MUST:

- decompose the mission into bounded tasks;
- assign tasks through the scheduler;
- enforce mission budgets;
- track progress and dead ends;
- trigger validation for material hypotheses;
- stop execution when a terminal condition is reached;
- produce a deterministic final mission state.

The controller MUST NOT directly execute shell, cloud, repository, or database actions.

### 4.3 Task Scheduler

The scheduler manages task readiness, leases, retries, priorities, and intentional duplicate work.

Each task MUST have:

- a unique identifier;
- one mission identifier;
- a role requirement;
- an explicit input scope;
- a maximum attempt count;
- a lease expiration;
- an idempotency key when tool use is possible;
- a defined expected output contract.

The scheduler SHOULD avoid duplicate expensive work. Independent validation is an explicit exception and MUST be labeled as such.

### 4.4 Agent Workers

Agents are role-bound workers. They receive a task, bounded context, an allowed-tool set, and output requirements.

Agents MUST communicate through structured task results and investigation events. Free-form peer-to-peer agent conversations are not part of the architecture.

Role definitions and permission limits are specified in `agents.md`.

### 4.5 Tool Gateway

The Tool Gateway is the only component allowed to call external systems.

It MUST:

- authenticate tool requests;
- verify mission and agent permissions;
- classify side-effect risk;
- redact secrets from stored output;
- enforce time, output-size, and rate limits;
- attach provenance and audit metadata;
- reject commands or requests outside the declared scope;
- require approval tokens for controlled side effects.

Agents MUST NOT receive raw long-lived credentials.

### 4.6 Provider Adapters

Provider adapters isolate model-specific APIs from agent logic.

Adapters MUST expose a common request and response contract, capability metadata, usage accounting, timeout handling, and normalized errors. Model output is untrusted until parsed and validated.

Provider requirements are specified in `providers.md`.

### 4.7 Evidence Store

The Evidence Store persists observations with provenance, integrity metadata, sensitivity labels, and collection timestamps.

Evidence is append-only at the logical level. Corrections MUST create a new record that supersedes or invalidates the old record. Existing evidence MUST NOT be silently rewritten.

### 4.8 Investigation Graph

The Investigation Graph represents relationships among evidence, entities, events, tasks, agents, and hypotheses.

It MUST support:

- provenance tracing;
- independent-source grouping;
- contradiction edges;
- temporal ordering;
- support and refutation edges;
- stale or superseded evidence;
- graph traversal for report generation.

The graph specification is defined in `investigation-graph.md`.

### 4.9 Policy Engine

The Policy Engine decides whether a requested operation is allowed, denied, or requires approval.

Policy evaluation MUST be deterministic for identical inputs and MUST produce a reason code. A model MUST NOT be the final authority for permission decisions.

### 4.10 Approval Gateway

The Approval Gateway issues short-lived, scoped approval tokens for controlled actions.

An approval token MUST bind:

- mission identifier;
- action identifier;
- exact tool and operation;
- target resource scope;
- expiration time;
- approving identity;
- policy version.

Approval for one action MUST NOT authorize a broader or later action.

### 4.11 Reporter

The Reporter converts verified investigation state into a human-readable result.

A report MUST include:

- mission outcome;
- ranked hypotheses;
- confidence and confidence rationale;
- supporting evidence references;
- contradictory evidence references;
- actions performed, if any;
- unresolved questions;
- limitations and collection gaps;
- recommended next steps.

## 5. Mission lifecycle

A mission follows this state model:

```text
DRAFT
  -> VALIDATING
  -> READY
  -> RUNNING
  -> VALIDATING_FINDINGS
  -> REPORTING
  -> COMPLETED

Any active state may move to:
  -> PAUSED
  -> CANCELLED
  -> BUDGET_EXHAUSTED
  -> FAILED
  -> APPROVAL_REQUIRED
```

Terminal states are `COMPLETED`, `CANCELLED`, `BUDGET_EXHAUSTED`, and `FAILED`.

Transitions MUST be recorded as audit events. A terminal mission MUST NOT resume under the same mission identifier.

## 6. Investigation flow

A standard read-only investigation proceeds as follows:

1. Validate mission and permissions.
2. Establish initial scope and known facts.
3. Generate broad scout tasks.
4. Collect evidence through the Tool Gateway.
5. Create or update hypotheses.
6. Score investigation paths and schedule deeper tasks.
7. Trigger independent validation for material hypotheses.
8. Evaluate stop conditions and remaining uncertainty.
9. Produce the final report.
10. Close resources and write the final audit event.

A remediation flow adds:

1. Create a proposed action plan.
2. Evaluate policy and risk class.
3. Request human approval when required.
4. Execute through the Tool Gateway using a scoped approval token.
5. Verify the result independently.
6. Record rollback status and post-action evidence.

## 7. Data ownership and persistence

The initial implementation MAY use local files or an embedded database. Production-oriented deployments SHOULD use a transactional store.

Logical stores are:

- mission store;
- task store;
- evidence store;
- hypothesis store;
- graph store;
- audit-event store;
- approval store;
- provider-usage ledger.

All persisted records MUST include schema version and creation timestamp. Records that can change state MUST include an optimistic concurrency version or equivalent conflict control.

## 8. Consistency and idempotency

Ants assumes tool calls and worker execution can fail, time out, or be retried.

Therefore:

- task processing MUST be at-least-once;
- state mutations MUST be idempotent where practical;
- tool calls with possible side effects MUST require an idempotency key;
- duplicate evidence SHOULD be detected by content and source fingerprints;
- retries MUST preserve the original task identity and increment attempt metadata;
- stale task results MUST be rejected after lease expiration unless explicitly reconciled.

## 9. Confidence and consensus

Ants MUST NOT calculate confidence by counting agreeing agents.

Confidence SHOULD consider:

- evidence quality;
- source reliability;
- source independence;
- temporal relevance;
- reproducibility;
- contradiction strength;
- collection completeness.

A hypothesis supported by several agents using the same source counts as one evidence chain, not several independent confirmations.

Confidence is an aid to prioritization and communication. It is not a probability guarantee.

## 10. Failure model

Ants MUST expect and handle:

- provider timeouts and malformed model output;
- tool timeouts and partial responses;
- unavailable external systems;
- expired credentials;
- task-worker crashes;
- duplicate messages;
- stale leases;
- schema-version mismatch;
- budget exhaustion;
- prompt injection in collected content;
- contradictory or deceptive evidence.

A component failure MUST NOT silently widen permissions or skip required validation.

## 11. Observability

Every mission MUST produce structured events for:

- mission transitions;
- task creation, lease, completion, retry, and failure;
- provider calls and token or cost usage;
- tool authorization decisions;
- tool start and completion;
- evidence creation;
- hypothesis creation and score change;
- approval request and decision;
- report generation.

Logs MUST avoid secrets and unnecessary personal data. Correlation fields MUST include mission ID, task ID, agent run ID, and trace ID where applicable.

## 12. Security invariants

The following invariants are mandatory:

1. Read-only is the default operating mode.
2. Agents never receive unrestricted production credentials.
3. External content is data, never authority.
4. Permission decisions are deterministic and policy-based.
5. Every external action passes through the Tool Gateway.
6. Material claims require provenance.
7. Controlled actions require scoped approval unless explicitly pre-authorized by policy.
8. Destructive actions are denied by default.
9. Secrets are redacted before persistence or model submission where possible.
10. Audit records cannot be silently altered.

See `security.md` for the threat model and approval matrix.

## 13. Deployment profiles

### Local profile

- one Node.js process;
- local filesystem or embedded persistence;
- local repository and log tools;
- no write-capable cloud tools;
- interactive terminal reports.

### Team profile

- controller service;
- worker processes;
- transactional database;
- queue or stream transport;
- centralized audit and observability;
- external secret manager;
- organization identity and approval integration.

### Controlled cloud profile

- isolated worker identities;
- provider-specific read-only adapters;
- policy-enforced write gateway;
- private network boundaries;
- immutable audit export;
- mandatory approval workflow for production changes.

## 14. Extension points

New agents, tools, providers, and evidence types MAY be added if they preserve the core contracts.

An extension MUST declare:

- identifier and version;
- required permissions;
- input and output schemas;
- side-effect classification;
- data-sensitivity behavior;
- timeout and retry policy;
- audit events;
- compatibility range.

## 15. Phase 3 implementation boundary

Phase 3 will implement a local read-only incident investigator for a Node.js service. It will consume local logs, system metadata, source code, and Git history, then produce structured evidence and ranked hypotheses.

Phase 3 MUST NOT require cloud credentials or enable remediation actions.

## 16. Related specifications

- [Agent roles and permissions](agents.md)
- [Mission contract](mission.md)
- [Evidence and hypothesis model](evidence.md)
- [Investigation graph](investigation-graph.md)
- [Tool and sandbox contracts](tools.md)
- [Provider adapters](providers.md)
- [Security and approval policy](security.md)
- [Internal events and APIs](api.md)
- [Architecture decisions](adr/README.md)
