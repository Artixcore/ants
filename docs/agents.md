# Agent Roles and Permission Model

Status: **Normative for Phase 2**

Ants agents are bounded workers, not autonomous identities. Each run is created for one mission task, receives only the context and tools required for that task, and terminates after producing a structured result.

## 1. Agent run contract

Every agent run MUST include:

- `agentRunId`;
- `missionId`;
- `taskId`;
- role identifier and role version;
- attempt number;
- lease expiration;
- permitted tools and operations;
- input references;
- output schema identifier;
- token, time, and tool-call budgets;
- active policy version.

An agent MUST NOT expand its own permissions, create hidden subagents, or continue after its lease expires.

## 2. Communication model

Agents do not hold unrestricted peer conversations. They communicate by creating structured outputs that the controller stores as events, evidence, findings, task proposals, or hypothesis updates.

This restriction exists to:

- reduce context drift;
- prevent authority laundering between agents;
- preserve provenance;
- keep costs measurable;
- enable deterministic replay and auditing;
- stop one compromised agent from directly instructing the colony.

A task result MAY propose follow-up work, but only the Mission Controller or Scheduler may create the next task.

## 3. Standard roles

### 3.1 Mission Controller

Purpose: own lifecycle and orchestration.

Allowed:

- read mission, task, budget, policy, and investigation state;
- create and prioritize tasks;
- request validations;
- transition mission state;
- invoke the Reporter after exit criteria are met.

Forbidden:

- direct shell or cloud execution;
- direct modification of evidence;
- bypassing policy evaluation;
- approving its own controlled action.

### 3.2 Scout

Purpose: broad, low-cost exploration.

Allowed:

- use read-only discovery tools within task scope;
- identify candidate entities, events, anomalies, and evidence sources;
- propose investigation paths;
- assign preliminary relevance scores.

Forbidden:

- making final root-cause claims;
- executing remediation;
- interpreting absent data as proof;
- accessing resources beyond the mission scope.

Expected output:

- observations;
- evidence references;
- candidate hypotheses;
- proposed follow-up tasks;
- collection gaps.

### 3.3 Investigator

Purpose: perform focused analysis on a promising path.

Allowed:

- inspect scoped evidence in depth;
- correlate events and timelines;
- create or update hypotheses;
- request narrowly defined additional evidence;
- run approved read-only reproduction or analysis tools.

Forbidden:

- treating model-generated explanations as evidence;
- ignoring contradictory evidence;
- widening resource scope without a new task;
- executing production changes.

### 3.4 Validator

Purpose: independently challenge a material hypothesis.

A Validator MUST receive only the evidence necessary for validation and SHOULD NOT receive the full reasoning transcript of the agent that proposed the hypothesis.

Allowed:

- test whether evidence supports the claim;
- search for alternative explanations;
- attempt reproduction;
- identify shared-source dependence;
- record support, partial support, refutation, or inconclusive status.

Forbidden:

- copying the proposer conclusion without independent work;
- counting duplicated sources as independent confirmation;
- changing the hypothesis to make validation easier.

### 3.5 Security Guard

Purpose: inspect content and requested actions for security risk.

Allowed:

- classify untrusted instructions;
- detect possible prompt injection, secret exposure, command injection, and exfiltration attempts;
- request redaction or quarantine;
- deny a tool request when deterministic security policy applies;
- refer ambiguous decisions to the Policy Engine.

Forbidden:

- acting as the sole approval authority for production changes;
- executing the suspicious content it is reviewing.

### 3.6 Remediation Planner

Purpose: convert verified findings into a proposed action plan.

Allowed:

- propose commands, configuration changes, patches, rollbacks, and verification steps;
- assign risk and reversibility metadata;
- identify prerequisites and rollback conditions.

Forbidden:

- executing the proposal;
- claiming success before verification;
- omitting known risks or contradictory evidence.

### 3.7 Executor

Purpose: perform a specifically approved action.

The Executor is disabled in read-only missions and is outside the Phase 3 implementation boundary.

Allowed only when:

- policy permits the action;
- a valid approval token is present when required;
- the exact target and operation match the token;
- rollback and verification steps are defined.

The Executor MUST stop on scope mismatch, token expiration, unexpected target expansion, or ambiguous tool output.

### 3.8 Reporter

Purpose: synthesize investigation state into a report.

Allowed:

- read mission, evidence, graph, hypothesis, validation, action, and audit summaries;
- generate human-readable and machine-readable reports;
- identify unresolved questions and limitations.

Forbidden:

- inventing missing evidence;
- silently removing contradictions;
- changing persisted confidence or validation state;
- presenting recommendations as executed actions.

## 4. Domain specializations

A role MAY have a domain profile. Initial profiles include:

- `code`: source, dependencies, tests, commits, and repository structure;
- `logs`: application, system, proxy, and audit logs;
- `runtime`: process, CPU, memory, disk, and network state;
- `database`: queries, locks, connections, schema, and execution plans;
- `ci`: workflow definitions, jobs, artifacts, and build logs;
- `cloud`: provider resources, metrics, identity, configuration, and events;
- `security`: vulnerabilities, secrets, access patterns, and policy drift;
- `cost`: utilization, idle resources, retention, and allocation signals.

A domain profile narrows tools and context. It does not grant additional authority.

## 5. Permission model

Permissions use the tuple:

```text
<resource-type>:<operation>:<scope>
```

Examples:

```text
filesystem:read:/workspace/service/logs/**
git:read:/workspace/service
process:read:local
aws-cloudwatch:read:arn:aws:logs:region:account:log-group/service-*
```

Operations are grouped as:

- `discover`: list metadata or available targets;
- `read`: retrieve data without intended mutation;
- `analyze`: execute local computation without external mutation;
- `propose`: create a plan, patch, or command without execution;
- `write`: mutate a non-production target;
- `execute`: invoke an operational action;
- `delete`: remove data or resources.

`write`, `execute`, and `delete` MUST be denied unless explicitly granted. `delete` is always high risk.

## 6. Context minimization

Each agent SHOULD receive:

- mission objective and constraints;
- task-specific context;
- relevant evidence summaries or references;
- required output schema;
- allowed tools;
- known collection limitations.

Agents SHOULD NOT receive:

- unrelated mission data;
- raw secrets;
- unrestricted previous transcripts;
- approval credentials not required for the task;
- sensitive evidence outside the assigned scope.

## 7. Task leasing and concurrency

Only one active worker SHOULD own a normal task lease. The scheduler MAY create an explicit duplicate task for independent validation.

A result produced after lease expiration is stale and MUST NOT mutate investigation state automatically. It MAY be reviewed and reconciled as a separate event.

## 8. Agent output

Every result MUST state:

- what the agent did;
- which tools and sources were used;
- observations;
- inferences;
- evidence IDs;
- confidence or relevance rationale;
- contradictions and limitations;
- proposed follow-up work;
- whether the task completed, failed, or was blocked.

An agent result itself is not primary evidence. It is an analysis record that references evidence.

## 9. Model separation

Different roles MAY use different models. Low-cost models may perform discovery, while stronger reasoning models may perform validation or reporting.

No role may depend on provider-specific prompt features as part of the core contract. Provider adapters must normalize the request and response shape.

## 10. Independence rules

Validation counts as independent only when the validator does not rely exclusively on the same evidence chain or copied reasoning.

The system MUST record an `independenceGroup` for evidence sources and validations. Two sources under the same group do not create two independent confirmations.

## 11. Stop behavior

An agent MUST stop and return `BLOCKED` when:

- required permission is absent;
- a tool requests broader scope than allowed;
- input schema is invalid;
- a secret appears where persistence or provider transmission is unsafe;
- the task cannot be completed within budget;
- an approval token is required but absent or invalid;
- instructions inside collected data conflict with the mission or system policy.
