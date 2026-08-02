# Tool Gateway and Sandbox Contracts

Status: **Normative for Phase 2**

The Tool Gateway is the sole boundary through which Ants interacts with filesystems, repositories, processes, databases, cloud providers, CI systems, networks, and notification services.

## 1. Tool definition

Every tool MUST declare:

- stable tool identifier;
- semantic version;
- description;
- supported operations;
- input and output schemas;
- required permission patterns;
- side-effect risk class;
- timeout limits;
- retry behavior;
- output-size limits;
- secret and sensitivity behavior;
- idempotency behavior;
- audit events;
- supported execution environments.

Tool definitions are configuration and code, not model-generated authority.

## 2. Risk classes

### Class 0: Pure analysis

No external access and no persistent mutation.

Examples:

- parse structured text;
- calculate hashes;
- compare timestamps;
- analyze an already collected artifact.

Approval: not required.

### Class 1: Read-only external access

Reads an allowed resource without intended mutation.

Examples:

- read a file;
- inspect Git history;
- query metrics;
- fetch cloud resource metadata;
- read CI logs.

Approval: normally not required when mission scope and policy allow it.

### Class 2: Local reversible mutation

Changes a local or isolated non-production artifact.

Examples:

- write a report file;
- create a proposed patch;
- build a temporary test fixture;
- modify an ephemeral sandbox.

Approval: policy-dependent.

### Class 3: Controlled operational mutation

Changes a remote or shared system but has a defined rollback.

Examples:

- open a pull request;
- scale a non-production worker;
- restart an approved development service;
- update a reversible feature flag.

Approval: required unless an organization policy explicitly pre-authorizes the exact operation.

### Class 4: High-risk or destructive mutation

May delete data, expose systems, alter identity, create material cost, or cause prolonged outage.

Examples:

- delete a database or storage bucket;
- change root or administrator access;
- disable security monitoring;
- expose a private service to the internet;
- rotate credentials without a tested recovery path;
- run destructive shell commands.

Approval: denied by default. Enabling such operations requires a separate high-risk policy outside the initial architecture.

## 3. Authorization flow

Every tool call follows:

1. Validate request schema.
2. Resolve mission, task, agent run, and policy context.
3. Match the requested operation against role permissions.
4. Match the target against mission scope.
5. Classify risk.
6. Evaluate deterministic policy.
7. Validate approval token when required.
8. Apply redaction and network constraints.
9. Execute with timeout and resource limits.
10. Normalize output.
11. Redact or quarantine sensitive results.
12. Persist provenance and audit metadata.

A model-generated statement such as "the user approved this" is never a valid approval token.

## 4. Tool request envelope

A request SHOULD include:

```json
{
  "schemaVersion": "1.0.0",
  "toolCallId": "call_01JEXAMPLE",
  "missionId": "mis_01JEXAMPLE",
  "taskId": "task_01JEXAMPLE",
  "agentRunId": "run_01JEXAMPLE",
  "toolId": "filesystem.read",
  "operation": "read",
  "target": "/workspace/service/logs/app.log",
  "arguments": {
    "startLine": 1,
    "endLine": 500
  },
  "idempotencyKey": "mis_01JEXAMPLE:task_01JEXAMPLE:app-log-1",
  "requestedAt": "2026-08-02T19:00:00Z"
}
```

## 5. Tool result envelope

A result SHOULD include:

- tool call ID;
- status;
- normalized data or secure artifact reference;
- start and end timestamps;
- bytes read or written;
- truncation status;
- redaction summary;
- source fingerprint;
- provider request ID where available;
- error category and retryability;
- audit-event ID.

Raw tool errors MUST be normalized before being given to agents. Secrets in errors or command output must be redacted.

## 6. Shell execution

Shell tools are high risk because command strings can hide scope expansion and injection.

The initial implementation SHOULD avoid a general-purpose shell tool. Prefer narrowly defined tools such as:

- `filesystem.read`;
- `filesystem.list`;
- `git.log`;
- `git.diff`;
- `node.test` in an isolated workspace;
- `process.snapshot`;
- `log.search`.

If a shell tool is later added, it MUST:

- use an argument array rather than an interpolated shell string where possible;
- disable shell expansion by default;
- enforce executable and argument allowlists;
- set a fixed working directory;
- block privilege escalation;
- apply CPU, memory, process, output, and time limits;
- block access to credential paths;
- block arbitrary network access;
- capture exit status and termination reason;
- reject control characters and unsafe redirection patterns.

## 7. Filesystem sandbox

Filesystem access MUST use resolved canonical paths and prevent path traversal and symlink escape.

The sandbox MUST:

- define allowed roots;
- resolve and verify the final path;
- deny special device files;
- deny secret paths by policy;
- cap bytes and line ranges;
- distinguish source files from generated artifacts;
- prevent writes outside an isolated output root.

## 8. Network sandbox

Outbound network access is denied by default.

A network-enabled tool MUST use an allowlist by scheme, host, port, and operation. It MUST block:

- loopback and link-local targets unless explicitly required;
- cloud metadata endpoints;
- private network ranges outside mission policy;
- redirects to disallowed destinations;
- credential-bearing URLs;
- unbounded downloads;
- unsupported protocols.

This protects against SSRF, exfiltration, and malicious links embedded in evidence.

## 9. Cloud tools

Cloud adapters MUST use short-lived, least-privilege identities where available.

A cloud tool MUST record:

- provider;
- account, project, or subscription;
- region;
- resource identifier;
- API operation;
- provider request ID;
- effective identity;
- read or mutation classification.

Cloud SDK methods that appear read-only but create charges or trigger work must be classified according to actual effects.

## 10. Database tools

Read-only database access SHOULD use a database role that cannot mutate schema or data.

Database tools MUST:

- use parameterized queries;
- enforce statement timeout;
- cap returned rows and bytes;
- block multiple statements;
- block write keywords in read-only mode;
- avoid collecting sensitive row data when metadata is sufficient;
- record database and query fingerprints without exposing credentials.

## 11. Repository and CI tools

Repository tools SHOULD operate at an explicit commit or ref to preserve reproducibility.

CI tools MUST distinguish:

- reading workflow definitions and logs;
- re-running a job;
- dispatching a workflow;
- approving deployment gates;
- publishing artifacts.

Only the first category is read-only.

## 12. Idempotency and retries

Read-only calls MAY be retried under a bounded policy.

Mutating calls MUST provide an idempotency key or a provider-native equivalent. A retry MUST first check whether the original action completed.

Tools MUST classify errors as:

- validation;
- permission;
- policy denial;
- approval required;
- timeout;
- rate limit;
- transient provider failure;
- permanent provider failure;
- malformed output;
- sandbox violation;
- cancelled.

## 13. Output handling

Tool output SHOULD be summarized before model use when the full output is large. The original artifact or secure reference remains the evidence source.

Summaries MUST record:

- the summarizer and version;
- parent evidence ID;
- truncation;
- omitted ranges;
- hash of the source artifact.

## 14. Approval token validation

A controlled action tool MUST reject approval when any bound field differs, including:

- mission;
- tool;
- operation;
- target;
- arguments that affect scope;
- expiration;
- policy version.

Approval cannot be reused for a different retry unless the token explicitly permits idempotent retry of the same action.

## 15. Tool invariants

1. No external access bypasses the Tool Gateway.
2. Permission is explicit and scope-bound.
3. Read-only labels reflect real side effects.
4. General shell access is avoided.
5. Secrets are never returned to agents when a reference is sufficient.
6. Every tool call is auditable.
7. Every mutation is policy-evaluated and idempotent where possible.
8. Tool failure never causes permission widening.
