# Ants

> Evidence-driven, investigative-agent incident analysis for Node.js projects.

[![Version](https://img.shields.io/badge/version-0.3.0-blue)](CHANGELOG.md)
[![Runtime](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](package.json)
[![Mode](https://img.shields.io/badge/operation-read--only-success)](docs/local-mvp.md)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue)](LICENSE)

**Ants** is a source-available Node.js project by [Artixcore](https://artixcore.com), created by [Ismam Tabriz Shams](https://artixcore.com/founder).

It investigates a technical failure like a disciplined colony of scout, investigator, validator, and reporter agents. Instead of asking one model to guess, Ants collects bounded evidence, records provenance, ranks competing explanations, challenges the leading hypothesis, and writes an auditable report.

## Phase 3 is working

Version `0.3.0` includes a runnable **Local Incident-Investigation MVP** for Node.js services.

It can currently:

- validate a strict read-only mission;
- inspect scoped local files without following symlinks or escaping the workspace;
- analyze logs, runtime diagnostics, JavaScript or TypeScript source, `package.json`, Git history, and the latest Git diff;
- detect Node.js heap exhaustion, port conflicts, disk exhaustion, missing modules, and unhandled errors;
- create immutable evidence records with hashes, provenance, integrity, sensitivity, and independence groups;
- construct and persist an investigation graph;
- rank hypotheses with deterministic confidence factors and contradiction penalties;
- independently validate hypotheses across multiple evidence sources;
- redact secret-like values and pause deeper investigation when policy requires it;
- enforce task, tool-call, duration, and byte-read budgets;
- write Markdown and JSON reports, evidence JSONL, hypotheses, graph data, and a tool audit trail.

Ants does **not** remediate systems in Phase 3. It does not contact cloud services, execute arbitrary shell strings, call hosted language models, or modify in-scope evidence files.

## Quick start

Requirements:

- Node.js 20 or newer
- Git, for Git-history analysis and the bundled demo

```bash
git clone https://github.com/Artixcore/ants.git
cd ants
npm ci
npm run check
npm run demo
```

The demo creates a temporary two-commit Node.js service, investigates a deterministic out-of-memory crash, and prints the generated report directory.

Expected leading conclusion:

```text
The Node.js process crashed because upload processing exhausted the
JavaScript heap through full-file buffering, copying, or retained buffers.
```

## CLI

### Validate a mission

```bash
node src/cli.js validate ./mission.json
```

### Investigate a local workspace

```bash
node src/cli.js investigate ./mission.json \
  --workspace ./service \
  --output ./report
```

### Run the bundled incident

```bash
npm run demo
```

### Show version or help

```bash
node src/cli.js --version
node src/cli.js --help
```

## Investigation flow

```text
Mission JSON
    |
    v
Mission validation and budgets
    |
    v
Scoped Tool Gateway
    |
    v
Scout
  logs + runtime + source + Git
    |
    v
Evidence Store and Investigation Graph
    |
    v
Investigator
  competing root-cause hypotheses
    |
    v
Validator
  independent cross-source challenge
    |
    v
Reporter
  Markdown + JSON + audit artifacts
```

The MVP uses deterministic engineering rules rather than a hosted AI provider. This keeps the first implementation reproducible, inexpensive, private, and easy to test. Provider-neutral model adapters remain part of the architecture for later phases.

## Mission format

A mission defines:

- objective;
- local include and exclude scope;
- read-only permissions;
- task, time, tool-call, token, cost, and byte budgets;
- confidence and validation stop conditions;
- secret-detection behavior;
- report format.

See:

- [`examples/incidents/node-memory-crash/mission.json`](examples/incidents/node-memory-crash/mission.json)
- [`schemas/mission.schema.json`](schemas/mission.schema.json)
- [`docs/mission.md`](docs/mission.md)

Phase 3 accepts only:

```text
mode: read-only
environment: local
```

Write, execute, and delete permissions are rejected.

## Report artifacts

A normal run writes:

```text
report/
├── report.md
├── report.json
├── evidence.jsonl
├── hypotheses.json
├── graph.json
└── audit.json
```

The report explains:

- the leading root-cause hypothesis;
- confidence and its contributing factors;
- supporting evidence;
- independent evidence groups;
- contradictions;
- validator outcome;
- corrective recommendations;
- known limitations;
- task and budget usage;
- every local tool call.

Confidence values are deterministic engineering heuristics, not statistical probabilities.

## Safety model

Ants follows old, proven operational discipline: inspect first, preserve evidence, show your work, and never cut before measuring twice.

The Phase 3 safety rules are:

1. Only local, read-only missions are accepted.
2. Canonical paths must remain inside the configured workspace.
3. Symlinks, device files, `.env`, `.git` internals, `node_modules`, and generated `.ants` output are denied by default.
4. Git commands use fixed argument arrays with prompting disabled.
5. No general-purpose shell tool exists.
6. Secret-like content is redacted before evidence storage.
7. A configured secret-detection policy pauses deeper analysis.
8. Every tool call is auditable.
9. Budget exhaustion produces a partial report rather than silent failure when reporting remains possible.
10. No remediation or production mutation is performed.

Read the complete implementation notes in [`docs/local-mvp.md`](docs/local-mvp.md).

## Architecture

The Phase 2 architecture remains normative for the system design:

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/agents.md`](docs/agents.md)
- [`docs/mission.md`](docs/mission.md)
- [`docs/evidence.md`](docs/evidence.md)
- [`docs/investigation-graph.md`](docs/investigation-graph.md)
- [`docs/tools.md`](docs/tools.md)
- [`docs/providers.md`](docs/providers.md)
- [`docs/security.md`](docs/security.md)
- [`docs/api.md`](docs/api.md)

Machine-readable contracts live in [`schemas/`](schemas/README.md).

## Project structure

```text
src/
├── agents/       Scout, Investigator, Validator, Reporter
├── analysis/     Deterministic source signals
├── core/         Mission, budgets, scheduler, IDs, errors
├── demo/         Reproducible demo workspace builder
├── security/     Path policy and redaction
├── store/        Evidence and graph persistence
├── tools/        Filesystem, Git, logs, runtime, gateway
├── controller.js
├── index.js
└── cli.js
```

## Current limitations

- The detector set is intentionally narrow.
- Git evidence requires an isolated `.git` directory inside the selected workspace.
- Ants does not attach to a live process or capture heap profiles.
- It does not parse arbitrary binary logs.
- It does not yet inspect GitHub Actions, remote repositories, or cloud telemetry.
- It proposes fixes but does not apply them.
- The MVP is not a substitute for an experienced incident commander or security responder.

## Roadmap

- Phase 1: repository foundation, complete
- Phase 2: architecture specification, complete
- Phase 3: local incident-investigation MVP, complete
- Phase 4: repository and CI integrations, next
- Phase 5: cloud observability integrations
- Phase 6: controlled remediation with explicit approval

See [`ROADMAP.md`](ROADMAP.md).

## Contributing

Contributions are welcome for permitted noncommercial purposes. Read:

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- [`SECURITY.md`](SECURITY.md)

Keep changes focused, testable, evidence-driven, and safe by default.

## License and commercial use

Ants is **source-available**, not OSI-approved open-source software, because commercial use is restricted.

It is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). Permitted noncommercial users may study, use, modify, and redistribute it under those terms.

Without a separate written license from Artixcore, you may not:

- sell or resell Ants;
- offer it as paid SaaS or hosted access;
- include it in a commercial product;
- provide it as a paid managed service or consulting deliverable;
- use it primarily for commercial advantage;
- remove required copyright, authorship, or license notices.

Commercial licensing and partnerships should be discussed with [Artixcore](https://artixcore.com).

## Support Artixcore open projects

### Bitcoin

Network: Bitcoin Taproot

```text
bc1pxmzqnz5f5rnugar4alrts3as56l2s2wg8x0mrxnk0y78xfm6xljszn8kkh
```

### Solana

Network: Solana

```text
9n1xJAT64NyUrVMExAENDJZqvsyfsg3JPbqaHND6D9Hi
```

Always verify the network and address before sending. Cryptocurrency transactions are generally irreversible. Donations do not purchase ownership, service, commercial rights, or control of the project.

## Ownership

- **Project:** Ants
- **Organization:** [Artixcore](https://artixcore.com)
- **Author:** [Ismam Tabriz Shams](https://artixcore.com/founder)
- **Copyright:** Copyright 2026 Artixcore. All commercial rights reserved.
