# Ants

> Evidence-driven local incident investigation for Node.js projects.

[![Version](https://img.shields.io/badge/version-0.3.1-blue)](CHANGELOG.md)
[![Runtime](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](package.json)
[![Operation](https://img.shields.io/badge/operation-read--only-success)](docs/local-mvp.md)
[![Security](https://img.shields.io/badge/security-hardened%20MVP-success)](SECURITY.md)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue)](LICENSE)

**Project navigation:** [Documentation](docs/README.md) | [Contributing](CONTRIBUTING.md) | [Code of Conduct](CODE_OF_CONDUCT.md) | [Security](SECURITY.md) | [License](LICENSE)

**Ants** is a source-available Node.js project by [Artixcore](https://artixcore.com), created by [Ismam Tabriz Shams](https://artixcore.com/founder).

It investigates technical failures through bounded Scout, Investigator, Validator, and Reporter stages. Ants collects evidence, records provenance, ranks competing explanations, challenges the leading hypothesis, and produces an auditable report instead of asking one unrestricted agent to guess.

## Current status

Version `0.3.1` provides a security-hardened **Phase 3 Local Incident-Investigation MVP**.

The MVP can:

- validate strict local read-only missions;
- create a safe starter mission with the CLI;
- inspect scoped files without following symlinks or escaping the workspace;
- analyze logs, runtime diagnostics, JavaScript and TypeScript source, `package.json`, Git history, and recent Git changes;
- detect Node.js heap exhaustion, port conflicts, disk exhaustion, missing modules, and unhandled errors;
- create evidence records with hashes, provenance, sensitivity, redaction information, and independence groups;
- persist an investigation graph;
- rank hypotheses with deterministic confidence factors and contradiction penalties;
- validate conclusions across independent evidence sources;
- redact common secret formats and pause when configured;
- enforce duration, task, tool-call, depth, and byte-read budgets;
- write Markdown, JSON, JSONL, graph, hypothesis, and audit artifacts.

Ants does **not** remediate systems in Phase 3. It does not contact cloud services, execute arbitrary shell strings, call hosted language models, or mutate files being investigated.

## Quick start

Requirements:

- Node.js 20 or newer
- Git, only when Git-history analysis or the bundled demo is needed

```bash
git clone https://github.com/Artixcore/ants.git
cd ants
npm ci
npm run check
npm run demo
```

The demo creates an isolated two-commit service, investigates a deterministic memory crash, and writes its report under the temporary demo workspace's `.ants` directory.

The repository now includes a valid starter mission at [`mission.json`](mission.json), so this command works immediately:

```bash
node src/cli.js validate mission.json
```

Expected demo conclusion:

```text
The Node.js process crashed because upload processing exhausted the
JavaScript heap through full-file buffering, copying, or retained buffers.
```

## Use Ants on your own project

A mission describes what Ants may inspect. Create one inside the Node.js project you want to investigate.

### Git Bash on Windows

```bash
cd /d/path/to/your-node-project
node /d/ants/src/cli.js init mission.json
node /d/ants/src/cli.js validate mission.json
node /d/ants/src/cli.js investigate mission.json --workspace .
```

### PowerShell

```powershell
Set-Location D:\path\to\your-node-project
node D:\ants\src\cli.js init mission.json
node D:\ants\src\cli.js validate mission.json
node D:\ants\src\cli.js investigate mission.json --workspace .
```

The generated report will be written to:

```text
<your-project>/.ants/runs/<mission-id>/
```

Edit `mission.json` before investigating when your project uses different source, log, or diagnostic directories.

## CLI

### Create a starter mission

```bash
node src/cli.js init mission.json
```

The command:

- creates a new valid read-only mission;
- generates a unique mission ID;
- writes only inside the current working directory;
- requires a `.json` file name;
- refuses absolute paths and `..` traversal;
- refuses to overwrite an existing file.

The Ants repository already contains `mission.json`, so run `init` inside the project you want to investigate rather than inside the Ants repository.

### Validate a mission

```bash
node src/cli.js validate mission.json
```

When the file is missing, the CLI now prints an actionable instruction to create it with `init`.

### Investigate a workspace

```bash
node src/cli.js investigate mission.json --workspace .
```

Or investigate another directory:

```bash
node src/cli.js investigate ./mission.json \
  --workspace ./service
```

### Choose a report directory

The output path is resolved relative to the workspace and must remain under `.ants`:

```bash
node src/cli.js investigate ./mission.json \
  --workspace ./service \
  --output .ants/manual-run
```

External output paths and paths inside application source directories are rejected.

### Run the bundled incident

```bash
npm run demo
```

### Show help or version

```bash
node src/cli.js --help
node src/cli.js --version
```

Unknown options, duplicate options, missing values, and unexpected positional arguments are rejected.

## Investigation flow

```text
Mission JSON
    |
    v
Strict validation and hard budgets
    |
    v
Scoped Tool Gateway
    |
    v
Scout
  logs + runtime + source + optional Git
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
  Markdown + JSON + evidence + graph + audit
```

The MVP uses deterministic engineering rules. Provider-neutral model adapters remain part of the architecture for later phases.

## Mission requirements

A Phase 3 mission must use:

```text
mode: read-only
environment: local
```

Mission paths and globs must be relative to the selected workspace. Absolute paths and `..` traversal are rejected.

A mission defines:

- objective and requester;
- include and exclude scope;
- filesystem and optional Git permissions;
- task, time, tool-call, depth, token, cost, and byte budgets;
- confidence and validation stop conditions;
- secret-detection behavior;
- report format and included sections.

See:

- [`mission.json`](mission.json)
- [`examples/incidents/node-memory-crash/mission.json`](examples/incidents/node-memory-crash/mission.json)
- [`examples/missions/node-service-failure.json`](examples/missions/node-service-failure.json)
- [`schemas/mission.schema.json`](schemas/mission.schema.json)
- [`docs/mission.md`](docs/mission.md)

## Report artifacts

A normal run writes only beneath `<workspace>/.ants/`:

```text
.ants/runs/<mission-id>/
├── report.md
├── report.json
├── evidence.jsonl
├── hypotheses.json
├── graph.json
└── audit.json
```

The report includes:

- leading and ranked hypotheses;
- confidence factors and validator outcome;
- supporting evidence IDs and independence groups;
- contradictions when requested;
- recommended corrective actions;
- limitations and collection gaps;
- task and budget usage;
- every attempted local tool call.

Confidence values are deterministic engineering heuristics, not statistical probabilities.

## Safety model

1. Only local read-only missions are accepted.
2. Missing permission means denial.
3. Permission scope is enforced independently of mission scope.
4. Workspace and file paths are canonicalized and bounded.
5. Workspace roots, evidence files, and output path components may not be symlinks.
6. `.env`, `.git` internals, `node_modules`, `.ssh`, private-key files, and `.ants` are excluded by default.
7. File reads are capped before allocation.
8. Git uses fixed argument arrays, disabled external diff and textconv features, isolated configuration, no pager, and no terminal prompts.
9. No general-purpose shell tool exists.
10. Secret-like content is redacted before evidence storage.
11. Report writes use exclusive temporary files and atomic replacement beneath `.ants`.
12. Starter mission creation refuses overwrites and unsafe output paths.
13. A safety report may bypass an exhausted investigation budget, but it cannot call investigation tools.
14. No remediation or production mutation is performed.

## Project structure

```text
src/
├── agents/       Scout, Investigator, Validator, Reporter
├── analysis/     Deterministic source signals
├── core/         Mission, starter template, budgets, scheduler, IDs, safe errors
├── demo/         Reproducible demo workspace builder
├── security/     Path, output, redaction, and safe-write controls
├── store/        Evidence and graph persistence
├── tools/        Filesystem, Git, logs, runtime, Tool Gateway
├── controller.js
├── index.js
└── cli.js
```

## Testing

```bash
npm ci
npm run lint
npm test
npm run check
npm run security:audit
```

The test suite covers first-run mission creation, missing-file guidance, malformed missions, traversal, symlink escape, bounded reads, binary input, permission-scope enforcement, output isolation, secret redaction, terminal controls, report survival after budget exhaustion, and malicious Git diff drivers.

## Architecture and documentation

- [Documentation index](docs/README.md)
- [System architecture](docs/architecture.md)
- [Agent roles](docs/agents.md)
- [Mission contract](docs/mission.md)
- [Evidence model](docs/evidence.md)
- [Investigation graph](docs/investigation-graph.md)
- [Tool Gateway](docs/tools.md)
- [Provider adapters](docs/providers.md)
- [Security threat model](docs/security.md)
- [Local MVP implementation](docs/local-mvp.md)
- [Internal APIs](docs/api.md)

Machine-readable contracts live under [`schemas/`](schemas/README.md).

## Current limitations

- The detector set remains intentionally narrow.
- Ants does not attach to live processes or capture heap profiles.
- It does not parse arbitrary binary logs.
- Git worktrees that use a `.git` file are not supported in Phase 3.
- Git subprocesses are time and output bounded, but Phase 3 does not provide operating-system-level CPU or memory containers.
- It does not yet inspect remote repositories, GitHub Actions, or cloud telemetry.
- Secret detection is pattern-based and cannot guarantee detection of every credential format.
- It proposes corrective actions but never applies them.
- The MVP is not a substitute for an experienced incident commander or security responder.

## Roadmap

- Phase 1: repository foundation, complete
- Phase 2: architecture specification, complete
- Phase 3: local incident-investigation MVP and hardening, complete
- Phase 4: repository and CI integrations, next
- Phase 5: cloud observability integrations
- Phase 6: controlled remediation with explicit approval

See [`ROADMAP.md`](ROADMAP.md).

## Contributing

Contributions are welcome for permitted noncommercial purposes. Start with:

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- [`SECURITY.md`](SECURITY.md)

Do not report exploitable security issues through public issues.

## License and commercial use

Ants is **source-available**, not OSI-approved open-source software, because commercial use is restricted.

It is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). Permitted noncommercial users may study, use, modify, and redistribute it under those terms.

Without a separate written license from Artixcore, you may not sell or resell Ants, offer paid hosted access, include it in a commercial product, provide it as a paid managed service, use it primarily for commercial advantage, or remove required notices.

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
