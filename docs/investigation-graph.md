# Investigation Graph Design

Status: **Normative for Phase 2**

The Investigation Graph is the shared map of what Ants knows, suspects, and has tested. It links evidence to entities, events, tasks, findings, hypotheses, validations, and actions while preserving provenance.

## 1. Purpose

The graph enables Ants to answer:

- which evidence supports a hypothesis;
- which sources are independent;
- what contradicts a conclusion;
- what happened before and after an event;
- which agent and tool created each record;
- which investigation paths remain unresolved;
- what information would most reduce uncertainty;
- which report claims depend on which evidence chains.

The graph is not a replacement for the source records. It stores relationships and selected searchable properties while durable records remain authoritative.

## 2. Node types

### Mission

Represents one top-level investigation.

Key fields:

- mission ID;
- objective;
- mode;
- status;
- policy version;
- created and closed timestamps.

### Task

Represents bounded work scheduled within a mission.

Key fields:

- task ID;
- required role;
- status;
- priority;
- lease;
- attempt count;
- parent task.

### AgentRun

Represents one worker attempt.

Key fields:

- agent run ID;
- role and domain;
- model adapter;
- start and end timestamps;
- outcome;
- token and tool usage.

### ToolCall

Represents one authorized external operation.

Key fields:

- tool call ID;
- tool and operation;
- target scope;
- risk class;
- policy decision;
- start and end timestamps;
- result status.

### Evidence

Represents an immutable observation or reference to an artifact.

Key fields follow `schemas/evidence.schema.json`.

### Finding

Represents an interpretation of evidence.

### Hypothesis

Represents a testable explanation.

Key fields follow `schemas/hypothesis.schema.json`.

### Validation

Represents an independent evaluation of a hypothesis.

### Entity

Represents a technical object such as:

- service;
- process;
- host;
- container;
- repository;
- commit;
- deployment;
- database;
- query;
- cloud resource;
- identity;
- endpoint;
- file;
- dependency.

### Event

Represents something that occurred at a time or during a time range.

Examples:

- deployment completed;
- latency crossed threshold;
- process terminated;
- certificate expired;
- IAM policy changed;
- CI job failed.

### ActionPlan

Represents a proposed remediation.

### Action

Represents an approved or executed operation.

### Report

Represents a mission report and its claim references.

## 3. Edge types

Core edges include:

| Edge | Meaning |
| --- | --- |
| `HAS_TASK` | Mission owns a task. |
| `PARENT_OF` | Task decomposition relationship. |
| `EXECUTED_BY` | Task attempt was performed by an agent run. |
| `CALLED` | Agent run invoked a tool call. |
| `PRODUCED` | Tool call or agent run produced a record. |
| `OBSERVED_ON` | Evidence describes an entity. |
| `OBSERVED_EVENT` | Evidence captures an event. |
| `DERIVED_FROM` | Record was transformed from earlier evidence. |
| `SUPPORTS` | Evidence or finding supports a hypothesis. |
| `CONTRADICTS` | Evidence or validation challenges a claim. |
| `VALIDATES` | Validation evaluates a hypothesis. |
| `AFFECTS` | Event or hypothesis affects an entity. |
| `CAUSED_BY` | Proposed causal relationship. |
| `PRECEDES` | Temporal ordering. |
| `CORRELATES_WITH` | Non-causal relationship. |
| `SAME_SOURCE_CHAIN` | Records share an independence group. |
| `SUPERSEDES` | New record replaces a logically outdated record. |
| `PROPOSES` | Finding or hypothesis proposes a task or action plan. |
| `EXECUTES` | Action realizes an action plan. |
| `VERIFIES` | Evidence or validation verifies an action result. |
| `CITES` | Report claim cites a record. |

`CAUSED_BY` MUST be treated as a hypothesis edge until validated. It MUST NOT be inferred merely from temporal correlation.

## 4. Edge properties

An edge SHOULD store:

- edge ID;
- mission ID;
- edge type;
- source and target node IDs;
- creator agent run or deterministic process;
- creation timestamp;
- confidence where applicable;
- rationale;
- evidence references;
- status;
- schema version.

Relationship confidence MUST NOT replace the evidence references that justify it.

## 5. Graph invariants

1. Every node belongs to one mission, except reusable static metadata such as tool definitions.
2. Evidence nodes are logically immutable.
3. A hypothesis cannot support itself through a cycle.
4. A report claim must trace to at least one evidence chain or be labeled as a recommendation or limitation.
5. A validation must identify the hypothesis and evidence examined.
6. `SAME_SOURCE_CHAIN` relationships must be preserved during deduplication.
7. Temporal edges must record the timestamp basis and uncertainty.
8. Deleting a display node must not destroy the underlying audit or evidence record.
9. Cross-mission links require an explicit historical-memory policy.
10. Secret values must not be stored as graph properties.

## 6. Temporal model

Events may have:

- exact timestamp;
- start and end timestamp;
- estimated timestamp;
- source timestamp and collection timestamp;
- clock offset uncertainty.

Temporal comparison SHOULD account for:

- timezone conversion;
- host clock drift;
- delayed log delivery;
- batch metric aggregation;
- unknown event duration.

An event may precede another event without proving causation.

## 7. Independence representation

Every evidence node carries an independence group. Graph traversal used for confidence MUST collapse support paths that share the same underlying source chain.

Example:

```text
CloudWatch log event
  -> dashboard screenshot
  -> copied incident ticket
```

These three nodes may be useful for context but ordinarily form one independent source chain.

A staging reproduction collected separately may form another chain.

## 8. Contradiction handling

A contradiction is represented by an explicit `CONTRADICTS` edge and a contradiction record.

Contradictions may target:

- a finding;
- a hypothesis;
- a causal edge;
- another evidence interpretation;
- an action verification claim.

Resolution states are:

- `open`;
- `explained-by-scope`;
- `explained-by-time`;
- `source-invalidated`;
- `claim-revised`;
- `unresolved`.

An unresolved material contradiction must remain visible in the final report.

## 9. Pheromone projection

Pheromone is a scheduling projection over the graph, not a permanent truth value.

A path may receive a higher score when it connects:

- high-relevance evidence;
- a material unresolved hypothesis;
- independent sources;
- recent events;
- a low-cost task with high expected information gain.

The projection SHOULD decay over mission time and repeated inconclusive work.

Pheromone changes MUST be recorded so the scheduler's priorities can be explained.

## 10. Storage implementation

The logical model does not require a graph database.

Phase 3 MAY implement the graph using:

- normalized JSON records;
- SQLite tables;
- PostgreSQL tables;
- an in-memory adjacency index backed by durable records.

A later deployment MAY use a graph database if operational value justifies it.

The public contracts must remain storage-neutral.

## 11. Query requirements

The implementation SHOULD support queries such as:

- all evidence supporting a hypothesis grouped by independence source;
- all unresolved contradictions for a mission;
- timeline of events for an entity;
- complete provenance chain for an evidence record;
- all tasks that touched a resource;
- all report claims derived from invalidated evidence;
- highest-priority unresolved investigation paths;
- actions lacking independent post-action verification.

## 12. Example

```text
[Deployment d-104]
      |
      | PRECEDES
      v
[Latency spike e-51] <---- OBSERVED_EVENT ---- [Metric evidence ev-10]
      |
      | CORRELATES_WITH
      v
[New search query q-9] <---- OBSERVED_ON ----- [Slow log ev-11]
      |
      | SUPPORTS
      v
[Hypothesis hyp-3: missing index]
      ^
      | VALIDATES
[Validation val-2: staging execution plan]
      |
      | PRODUCED
      v
[Reproduction evidence ev-18]
```

The graph makes clear that temporal correlation and causal validation are separate relationships.
