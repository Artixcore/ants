# Mission Contract and Lifecycle

Status: **Normative for Phase 2**

A mission is the top-level unit of work in Ants. It defines the question to investigate, the allowed scope, budgets, permissions, completion conditions, and reporting requirements.

The machine-readable contract is `schemas/mission.schema.json`.

## 1. Mission principles

A mission MUST be:

- explicit about the objective;
- bounded by resource scope;
- bounded by time, cost, tokens, and tool calls;
- read-only unless a stronger mode is deliberately selected;
- traceable to a requesting identity or trigger;
- reproducible enough to explain the investigation later;
- cancellable;
- closed with a terminal outcome and final audit event.

## 2. Required fields

A mission contains:

| Field | Meaning |
| --- | --- |
| `missionId` | Globally unique mission identifier. |
| `schemaVersion` | Version of the mission contract. |
| `title` | Short human-readable name. |
| `objective` | The question or outcome the investigation must address. |
| `mode` | `read-only`, `propose`, or `controlled-action`. |
| `scope` | Resources, paths, accounts, repositories, environments, and time windows that may be examined. |
| `permissions` | Explicit tool and operation grants. |
| `budgets` | Limits for time, tokens, cost, tasks, and tool calls. |
| `stopConditions` | Conditions that terminate or pause work. |
| `reporting` | Required output format and evidence detail. |
| `requestedBy` | Requesting identity or trigger metadata. |
| `createdAt` | UTC creation time. |

## 3. Optional fields

A mission MAY also contain:

- known facts;
- initial hypotheses;
- excluded resources;
- sensitivity classification;
- retention policy;
- provider preferences;
- required validators;
- minimum evidence requirements;
- approval policy override references;
- callback or notification configuration.

Optional fields MUST NOT silently weaken system policy.

## 4. Modes

### 4.1 Read-only

Agents may discover, read, and analyze resources within scope. They may propose changes but cannot execute them.

This is the default and the only mode required for Phase 3.

### 4.2 Propose

Agents may generate patches, configuration changes, commands, and remediation plans as artifacts. The artifacts are not executed by Ants.

### 4.3 Controlled action

Ants may execute specifically permitted operations after policy evaluation and, where required, human approval.

Selecting this mode does not automatically grant write access. Permissions and approval remain mandatory.

## 5. Scope

Scope is deny-by-default. A resource is accessible only when it matches an explicit include rule and no exclusion rule.

Scope dimensions MAY include:

- filesystem paths;
- repository owner, name, branch, commit, or pull request;
- cloud provider, account, region, project, subscription, and resource identifiers;
- cluster and namespace;
- database instance and logical database;
- log source and time range;
- CI provider, repository, workflow, run, and job;
- network destination allowlist;
- environment label such as local, development, staging, or production.

An agent MUST request a new task or mission amendment when needed evidence falls outside scope.

## 6. Permissions

Mission permissions are upper bounds. Role policy and tool policy may narrow them further.

A permission record SHOULD contain:

```json
{
  "resourceType": "filesystem",
  "operation": "read",
  "scope": "/workspace/service/logs/**"
}
```

Wildcard permissions over an entire cloud account, filesystem root, or organization SHOULD be rejected unless an administrator policy explicitly allows them.

## 7. Budgets

Budgets MUST be enforced during execution, not merely reported afterward.

Supported budget categories include:

- wall-clock duration;
- model input and output tokens;
- estimated provider cost;
- number of tasks;
- task depth;
- tool calls;
- bytes read;
- evidence records;
- retry attempts.

The controller SHOULD reserve enough remaining budget for validation and reporting. A mission that spends everything on scouting has failed operationally even if it has collected data.

## 8. Stop conditions

Stop conditions may include:

- minimum confidence and evidence requirements reached;
- required independent validations completed;
- no material new evidence after a configured number of tasks;
- mission deadline reached;
- budget threshold reached;
- user cancellation;
- policy denial;
- unavailable required source;
- approval required;
- critical security event;
- unrecoverable system failure.

A confidence threshold alone MUST NOT complete a mission without the required evidence and validation conditions.

## 9. Lifecycle states

### `DRAFT`

Mission is being assembled and cannot execute.

### `VALIDATING`

Schema, scope, permissions, policy, and budgets are being checked.

### `READY`

Mission is valid and may be started.

### `RUNNING`

Tasks are being scheduled and executed.

### `VALIDATING_FINDINGS`

Material hypotheses are undergoing independent validation.

### `APPROVAL_REQUIRED`

Progress is paused because an operation needs explicit approval.

### `PAUSED`

Mission is intentionally suspended without becoming terminal.

### `REPORTING`

No new investigation tasks are created unless report generation reveals a required integrity gap.

### `COMPLETED`

Mission exited successfully with a final report.

### `BUDGET_EXHAUSTED`

A hard budget ended the mission. A partial report is still required when possible.

### `CANCELLED`

The requester or authorized operator cancelled the mission.

### `FAILED`

A system or policy failure prevented a defensible report.

## 10. Mission amendments

An active mission MAY be amended only by an authorized identity or deterministic policy.

An amendment MUST:

- receive a unique amendment ID;
- preserve the previous mission version;
- describe changed fields;
- pass schema and policy validation;
- invalidate incompatible task leases;
- generate an audit event.

An amendment MUST NOT retroactively authorize an action already attempted.

## 11. Completion criteria

A mission may complete when:

- required sources were examined or documented as unavailable;
- material hypotheses have validation outcomes;
- evidence provenance is intact;
- contradictions are included;
- budgets and actions are accounted for;
- report requirements are satisfied;
- no required approval remains unresolved.

The final outcome MAY be inconclusive. An honest inconclusive result is preferable to an unsupported conclusion.

## 12. Example mission

```json
{
  "schemaVersion": "1.0.0",
  "missionId": "mis_01JLOCALNODEFAILURE",
  "title": "Investigate local Node.js service failure",
  "objective": "Determine the most likely cause of the service crash using local logs, system metadata, source code, and Git history.",
  "mode": "read-only",
  "scope": {
    "environment": "local",
    "include": [
      "/workspace/service/logs/**",
      "/workspace/service/src/**",
      "/workspace/service/package.json",
      "/workspace/service/.git"
    ],
    "exclude": [
      "/workspace/service/.env",
      "/workspace/service/node_modules/**"
    ]
  },
  "permissions": [
    {
      "resourceType": "filesystem",
      "operation": "read",
      "scope": "/workspace/service/**"
    },
    {
      "resourceType": "git",
      "operation": "read",
      "scope": "/workspace/service"
    }
  ],
  "budgets": {
    "durationSeconds": 900,
    "maxTasks": 30,
    "maxToolCalls": 100,
    "maxModelTokens": 150000,
    "maxEstimatedCostUsd": 5
  },
  "stopConditions": {
    "requiredIndependentValidations": 1,
    "maxNoProgressTasks": 5,
    "completeWhenDefensible": true
  },
  "reporting": {
    "format": "markdown+json",
    "includeEvidenceIndex": true,
    "includeContradictions": true,
    "includeLimitations": true
  },
  "requestedBy": {
    "type": "user",
    "id": "local-user"
  },
  "createdAt": "2026-08-02T19:00:00Z"
}
```

## 13. Mission invariants

1. A mission has one immutable identity.
2. Scope expansion requires an amendment.
3. Permission absence means denial.
4. A terminal mission cannot resume.
5. Every mission attempts to produce a report, including partial or inconclusive outcomes.
6. Controlled actions require exact policy authorization.
7. Reports distinguish collected evidence from agent inference.
