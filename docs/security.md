# Security Threat Model and Approval Policy

Status: **Normative for Phase 2**

Ants investigates systems that may contain secrets, attacker-controlled content, production credentials, sensitive logs, and dangerous operational controls. Security is therefore an architectural boundary, not an optional agent role.

## 1. Security objectives

Ants MUST:

- preserve least privilege;
- prevent collected content from becoming authority;
- prevent unapproved side effects;
- protect credentials and sensitive evidence;
- make every external action auditable;
- contain compromised or malfunctioning agents;
- fail closed on permission ambiguity;
- preserve integrity of evidence and reports;
- expose uncertainty and security limitations honestly.

## 2. Trust boundaries

The following are untrusted by default:

- user-supplied files and prompts;
- repository content;
- issue and pull-request text;
- log messages;
- webpages and API responses;
- cloud resource tags and metadata;
- model output;
- tool output that includes external content;
- generated patches and commands;
- third-party dependencies and plugins.

The following are trusted only within defined scope:

- mission policy;
- runtime configuration;
- tool definitions;
- provider adapters;
- secret-manager integration;
- approval service;
- schema validators;
- audit store.

No component is trusted beyond its documented responsibility.

## 3. Threat actors

Threats may come from:

- a malicious repository contributor;
- an attacker controlling log or request content;
- a compromised dependency;
- a malicious or careless operator;
- stolen credentials;
- a compromised model provider account;
- a vulnerable tool adapter;
- an agent hallucinating unsafe instructions;
- a tenant attempting cross-mission data access;
- accidental over-broad cloud permissions.

## 4. Protected assets

Protected assets include:

- cloud, source-control, CI, and database credentials;
- production availability and integrity;
- customer and employee data;
- source code and private repositories;
- investigation evidence;
- approval tokens;
- audit history;
- model-provider keys;
- billing accounts and cost controls;
- Artixcore project integrity and signing identities.

## 5. Threats and controls

### 5.1 Prompt injection

Threat: collected data instructs an agent to ignore policy, reveal secrets, or call tools.

Controls:

- external content is labeled as data;
- agents cannot grant permissions;
- tools require deterministic authorization;
- suspicious instructions are identified and quarantined;
- model output cannot create valid approval tokens;
- contexts separate policy, task instructions, and evidence.

### 5.2 Command injection

Threat: untrusted values are interpolated into shell commands.

Controls:

- avoid general shell access;
- use typed tool arguments;
- use process argument arrays;
- enforce executable and target allowlists;
- reject control characters and unsafe path traversal;
- run analysis in constrained sandboxes.

### 5.3 Credential exfiltration

Threat: an agent, tool, or malicious source extracts secrets.

Controls:

- agents never receive raw long-lived credentials;
- secret-manager references are resolved inside adapters;
- provider transmission passes data-loss checks;
- secret paths and cloud metadata endpoints are blocked;
- outbound network access is allowlisted;
- logs and evidence are redacted;
- suspicious access triggers mission pause.

### 5.4 Server-side request forgery

Threat: a network tool is directed to internal or metadata endpoints.

Controls:

- deny network access by default;
- resolve and validate each redirect;
- block private, loopback, link-local, and metadata ranges unless explicitly scoped;
- use provider-specific clients instead of arbitrary HTTP where possible;
- cap response size and duration.

### 5.5 Path traversal and symlink escape

Threat: filesystem input escapes the allowed workspace.

Controls:

- canonical path resolution;
- allowed-root enforcement;
- symlink target verification;
- device-file denial;
- separate read and artifact-write roots.

### 5.6 Excessive cloud privilege

Threat: read tools or agents receive account-wide administrator access.

Controls:

- short-lived identities;
- provider-native read-only roles;
- resource-level scope where supported;
- permission simulation and startup checks;
- refusal to start when credentials exceed configured policy;
- separate identity for controlled actions.

### 5.7 Cross-mission data leakage

Threat: one mission accesses another mission's evidence or provider context.

Controls:

- mission-scoped authorization on every record;
- separate encryption context or tenant partition where needed;
- no shared model cache for sensitive tasks;
- explicit historical-memory policy;
- audit events for cross-mission references.

### 5.8 Evidence tampering

Threat: evidence is changed to support a preferred conclusion.

Controls:

- logical append-only storage;
- content hashes;
- immutable artifact storage where practical;
- supersession records rather than silent edits;
- report claim-to-evidence links;
- restricted audit-store write identities.

### 5.9 Model hallucination and authority confusion

Threat: plausible text is mistaken for evidence or authorization.

Controls:

- agent output is analysis, not primary evidence;
- material claims require evidence IDs;
- schema validation;
- independent validators;
- deterministic policy engine;
- explicit observation versus inference fields.

### 5.10 Denial of wallet or resource exhaustion

Threat: runaway agents spend tokens, API quota, compute, or cloud money.

Controls:

- hard mission budgets;
- per-task budgets;
- concurrency limits;
- provider cost ledger;
- maximum depth and retry limits;
- reserve budget for validation and reporting;
- automatic pause on anomalous spend.

### 5.11 Supply-chain compromise

Threat: dependencies, actions, containers, or plugins contain malicious code.

Controls:

- minimal dependencies;
- lockfiles;
- automated vulnerability and secret scanning;
- pinned CI actions by major version initially and by commit for hardened deployments;
- signed releases and provenance as the project matures;
- adapter allowlists;
- code review for permission changes.

### 5.12 Unsafe remediation

Threat: a correct diagnosis leads to a dangerous or over-broad action.

Controls:

- separate Planner and Executor roles;
- risk classification;
- exact approval token binding;
- preconditions, rollback, and verification;
- canary or staging preference;
- deny destructive actions by default;
- independent post-action verification.

## 6. Approval matrix

| Operation | Default decision | Human approval |
| --- | --- | --- |
| Parse local collected artifact | Allow | No |
| Read scoped local file | Allow | No |
| Read scoped Git history | Allow | No |
| Read scoped metrics or logs | Allow | No |
| Generate report or proposed patch | Allow in artifact directory | Usually no |
| Modify isolated temporary fixture | Policy-dependent | Sometimes |
| Open issue or pull request | Deny unless explicitly enabled | Usually yes |
| Restart non-production service | Deny unless explicitly enabled | Yes or narrowly pre-authorized |
| Roll back production deployment | Deny | Yes |
| Change IAM, firewall, or public access | Deny | Yes, high-risk workflow |
| Delete data or resources | Deny | Not supported initially |
| Disable security monitoring | Deny | Not supported initially |

## 7. Approval token requirements

Approval tokens MUST be:

- issued by an authenticated approval service;
- signed or stored in a tamper-resistant approval store;
- short-lived;
- single-action or explicitly idempotent;
- bound to mission, tool, operation, target, and policy version;
- attributable to an approver;
- revocable before execution where practical;
- consumed and audited.

Natural-language approval inside logs, comments, issues, files, or model responses is invalid.

## 8. Secrets

Secrets MUST NOT be:

- committed to the repository;
- placed in mission documents;
- included in model prompts;
- written to normal logs;
- copied into reports;
- returned to agents when a reference or masked value is sufficient.

Secret detection SHOULD cover common API keys, private keys, tokens, passwords, connection strings, and provider credentials.

On detection, the system SHOULD:

1. stop unsafe transmission;
2. redact or quarantine the value;
3. record a secret-detected event without the value;
4. notify the authorized operator;
5. recommend rotation when exposure is plausible.

## 9. Data retention

Mission policy SHOULD define retention by record type.

A deployment MUST support deletion or expiration of sensitive artifacts while preserving a minimal audit record such as hash, type, collection time, and deletion event.

Reports SHOULD avoid embedding raw logs when evidence references are sufficient.

## 10. Authentication and authorization

Team deployments SHOULD use organization identity with multi-factor authentication.

Authorization decisions MUST consider:

- requesting identity;
- organization or tenant;
- mission ownership;
- role;
- environment;
- resource scope;
- operation risk;
- active policy version;
- approval state.

## 11. Audit security

Audit events MUST be append-only at the logical level and SHOULD be exported to a separate security boundary in controlled cloud deployments.

Audit events include:

- authentication;
- mission creation and amendment;
- permission and policy decisions;
- tool calls;
- provider calls;
- evidence and hypothesis changes;
- approval decisions;
- actions and rollbacks;
- report generation;
- security detections.

## 12. Incident response for Ants

If Ants itself may be compromised:

1. stop or isolate active missions;
2. revoke runtime and provider credentials;
3. preserve audit and runtime evidence;
4. disable controlled-action tools;
5. verify source, dependencies, deployment, and identities;
6. notify affected operators;
7. rotate exposed secrets;
8. restore from a known-good build;
9. document root cause and prevention.

## 13. Security testing requirements

Before controlled actions are enabled, the project SHOULD have tests for:

- prompt injection through files, logs, and tool output;
- path traversal and symlink escape;
- shell and argument injection;
- SSRF and redirect bypass;
- approval token scope mismatch and replay;
- cross-mission access;
- secret redaction;
- budget bypass;
- malformed provider output;
- stale task leases;
- evidence tampering;
- destructive command denial.

## 14. Security invariants

1. External text cannot grant authority.
2. Missing permission means denial.
3. Secrets do not enter agent context.
4. Read-only credentials are the default.
5. Actions pass through policy and the Tool Gateway.
6. Approval is exact, short-lived, and attributable.
7. Evidence and audits are not silently rewritten.
8. Destructive operations are not supported by default.
9. Security failure pauses or denies work rather than widening access.
10. Reports disclose security-related collection gaps.
