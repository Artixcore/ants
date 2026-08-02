# Ants

> An evidence-driven, investigative-ant-inspired architecture for cloud operations, DevOps, SRE, security, and codebase analysis.

[![Project Status](https://img.shields.io/badge/status-architecture%20specified-blue)](#project-status)
[![Version](https://img.shields.io/badge/version-0.2.0-blue)](CHANGELOG.md)
[![Runtime](https://img.shields.io/badge/runtime-Node.js%2020%2B-339933?logo=nodedotjs&logoColor=white)](#development)
[![Interface](https://img.shields.io/badge/interface-shell%20%2F%20CLI-4EAA25?logo=gnubash&logoColor=white)](#development)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue)](LICENSE)

**Ants** is a Node.js, shell-driven project by [Artixcore](https://artixcore.com), created by [Ismam Tabriz Shams](https://artixcore.com/founder).

Ants is designed as a colony of bounded specialist agents. Scouts explore, investigators follow promising evidence, validators challenge important hypotheses, and reporters produce traceable conclusions. Shared truth lives in structured evidence and an investigation graph, not in endless agent chat.

## Project status

- **Phase 1, repository foundation:** complete
- **Phase 2, architecture specification:** complete
- **Current version:** `0.2.0`
- **Next milestone:** Phase 3 local incident-investigation MVP
- **Autonomy default:** read-only

The repository now contains a runnable CLI foundation, tests, continuous integration, normative architecture documentation, machine-readable JSON Schemas, example mission records, and Architecture Decision Records.

The actual multi-agent investigation engine is **not yet implemented**. Do not treat this version as a production DevOps operator or cloud remediation system.

## Why investigative ants?

Real scout ants explore independently and reinforce useful trails. Ants applies that pattern to technical investigation:

1. A mission defines the objective, scope, permissions, budgets, and stop conditions.
2. Scout agents inspect logs, metrics, code, Git history, deployments, databases, and cloud configuration within strict boundaries.
3. Tool output becomes immutable evidence with provenance and integrity metadata.
4. Findings and hypotheses cite evidence instead of relying on model confidence alone.
5. Promising investigation paths receive dynamic pheromone priority.
6. Validator agents attempt to reproduce, refute, or qualify material hypotheses independently.
7. A report exposes support, contradictions, uncertainty, missing evidence, and recommended next steps.
8. Any future operational action remains separated from investigation and subject to deterministic policy and exact approval.

## Architectural principles

Ants follows several non-negotiable rules:

- **Evidence before conclusions:** material claims cite evidence records.
- **Read-only by default:** missing permission means denial.
- **Structured coordination:** agents communicate through records and events, not unrestricted peer chat.
- **Independent validation:** repeated use of one source is not multiple confirmation.
- **Least privilege:** agents receive only task-specific context and tools.
- **Provider neutrality:** model and cloud providers sit behind adapters.
- **Auditability:** missions, tasks, tool calls, provider calls, evidence, approvals, and actions produce traceable events.
- **Human control:** high-impact actions cannot be authorized by model-generated text.

## Architecture specification

Phase 2 documentation is indexed in [`docs/README.md`](docs/README.md).

| Specification | Purpose |
| --- | --- |
| [System architecture](docs/architecture.md) | Components, lifecycle, data flow, consistency, failure model, and deployment profiles |
| [Agent roles](docs/agents.md) | Roles, permissions, leases, context boundaries, and validation independence |
| [Mission contract](docs/mission.md) | Scope, modes, budgets, stop conditions, amendments, and completion |
| [Evidence model](docs/evidence.md) | Provenance, integrity, confidence, contradiction, and pheromone scoring |
| [Investigation graph](docs/investigation-graph.md) | Nodes, edges, timelines, source chains, and graph queries |
| [Tool Gateway](docs/tools.md) | Risk classes, sandboxing, authorization, and idempotency |
| [Provider adapters](docs/providers.md) | Model capabilities, routing, credentials, cost, and fallback |
| [Security model](docs/security.md) | Threats, approval policy, secrets, audit, and security tests |
| [Memory model](docs/memory.md) | Working, mission, historical, and static memory |
| [Cloud architecture](docs/cloud.md) | Provider boundary, normalized cloud resources, identity, and AWS-first direction |
| [Internal APIs](docs/api.md) | Commands, events, queries, errors, delivery, and versioning |
| [Architecture decisions](docs/adr/README.md) | Accepted design decisions and consequences |

## Machine-readable contracts

The architecture is backed by JSON Schema Draft 2020-12 contracts:

- [`schemas/mission.schema.json`](schemas/mission.schema.json)
- [`schemas/evidence.schema.json`](schemas/evidence.schema.json)
- [`schemas/hypothesis.schema.json`](schemas/hypothesis.schema.json)
- [`schemas/tool-call.schema.json`](schemas/tool-call.schema.json)
- [`schemas/agent-message.schema.json`](schemas/agent-message.schema.json)
- [`schemas/provider-request.schema.json`](schemas/provider-request.schema.json)

Example records are available under [`examples/`](examples/README.md).

## Intended use cases

Ants is intended to support permitted noncommercial projects such as:

- investigating application crashes and service degradation;
- correlating logs, metrics, code changes, and deployment history;
- diagnosing CI/CD failures;
- examining runtime CPU, memory, disk, process, and network evidence;
- analysing database latency, locks, connections, and execution plans;
- reviewing cloud reliability and security configuration;
- identifying possible cloud-cost waste;
- preparing evidence-backed remediation plans;
- producing incident reports and postmortem material.

## Planned agent roles

| Role | Responsibility |
| --- | --- |
| Mission Controller | Owns mission lifecycle, decomposition, budgets, and stop conditions |
| Scout | Performs broad, low-cost discovery within scope |
| Investigator | Performs focused analysis on promising evidence paths |
| Validator | Independently challenges or reproduces material hypotheses |
| Security Guard | Detects unsafe content, secret exposure, and policy violations |
| Remediation Planner | Produces reversible proposed actions without execution |
| Executor | Performs exactly approved actions in a future controlled-action phase |
| Reporter | Produces evidence-backed human and machine-readable reports |

Domain profiles may specialize these roles for code, logs, runtime, databases, CI, cloud, security, and cost.

## Planned investigation flow

```text
Mission
  -> Validation and Policy
  -> Mission Controller
  -> Scout Tasks
  -> Evidence Store and Investigation Graph
  -> Focused Investigator Tasks
  -> Independent Validation
  -> Ranked Hypotheses
  -> Report
  -> Human Decision
```

Operational execution is deliberately outside the read-only Phase 3 boundary.

## Development

Requirements:

- Node.js 20 or newer
- npm

Clone and validate the current foundation:

```bash
git clone https://github.com/Artixcore/ants.git
cd ants
npm ci
npm run check
node ./src/cli.js --help
```

Current CLI capabilities are limited to project help and version reporting.

```bash
node ./src/cli.js --version
# 0.2.0
```

## Phase 3 target

The next implementation milestone is a local, read-only investigator that explains why a Node.js service failed using:

- local application and system logs;
- system and process metadata;
- source code;
- package metadata;
- Git history;
- deterministic sample incidents.

It will produce structured evidence, ranked hypotheses, contradictions, validation outcomes, and Markdown plus JSON reports.

See [`ROADMAP.md`](ROADMAP.md) for the full plan.

## Safety principles

Cloud and DevOps automation can cause outage, data loss, exposure, and unexpected cost. Any Ants implementation must:

1. use read-only credentials by default;
2. avoid root and unrestricted cloud identities;
3. keep secrets out of prompts, logs, and evidence records;
4. route external access through the Tool Gateway;
5. treat files, logs, issues, webpages, and resource names as untrusted data;
6. require exact policy authorization for every action;
7. prefer reversible actions with rollback plans;
8. preserve provenance and audit events;
9. disclose contradictions and missing evidence;
10. test in local or staging environments before production use.

## Contributing

Contributions, tests, documentation improvements, and permitted noncommercial integrations are welcome.

Read:

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- [`SECURITY.md`](SECURITY.md)

Architecture changes should include or update an Architecture Decision Record when they alter a foundational choice.

## Source-available noncommercial use

Ants is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE). Because commercial use is restricted, Ants is not Open Source Initiative-approved open-source software.

Permitted use generally includes personal study, hobby projects, noncommercial research, education, public-interest work, and qualifying nonprofit or government use under the license terms.

Without a separate written commercial license from Artixcore, you may not:

- sell or resell Ants;
- charge others for access to Ants;
- offer it as a paid SaaS, hosted service, managed service, or consulting deliverable;
- include it in a commercial product or paid package;
- use it primarily for commercial advantage;
- remove required copyright, authorship, or license notices.

Commercial licensing and partnership requests should be directed to [Artixcore](https://artixcore.com).

## Support the project

Voluntary donations may support Ants and Artixcore's other source-available projects.

### Bitcoin

Network: **Bitcoin Taproot**

```text
bc1pxmzqnz5f5rnugar4alrts3as56l2s2wg8x0mrxnk0y78xfm6xljszn8kkh
```

### Solana

Network: **Solana**

```text
9n1xJAT64NyUrVMExAENDJZqvsyfsg3JPbqaHND6D9Hi
```

Always verify the network and address before sending. Cryptocurrency transactions are generally irreversible. Donations do not purchase ownership, service, influence, or expanded license rights.

## Author and ownership

- **Project:** Ants
- **Organization:** [Artixcore](https://artixcore.com)
- **Author:** [Ismam Tabriz Shams](https://artixcore.com/founder)
- **Copyright:** Copyright 2026 Artixcore. All commercial rights reserved.

## License

Ants is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).

The project is provided **as is**, without warranties or guarantees. See the license for the controlling terms.
