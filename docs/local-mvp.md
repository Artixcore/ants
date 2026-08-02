# Phase 3 Local Incident-Investigation MVP

Status: **Implemented in v0.3.0**

The Phase 3 engine converts the Phase 2 architecture contracts into a bounded, deterministic investigation workflow for local Node.js services.

## Supported workflow

```text
Mission JSON
    -> validation
    -> scoped filesystem and Git sandbox
    -> Scout collection
    -> Investigator hypothesis ranking
    -> Validator cross-source challenge
    -> Reporter persistence
```

The engine reads local artifacts only. It does not call hosted language models, access the network, execute arbitrary shell strings, mutate in-scope evidence files, or perform remediation. It writes only report artifacts to the selected output directory.

## CLI

Validate a mission:

```bash
node src/cli.js validate ./mission.json
```

Investigate a workspace:

```bash
node src/cli.js investigate ./mission.json --workspace ./service --output ./report
```

Run the deterministic example:

```bash
npm run demo
```

## Inputs

The MVP can inspect:

- `.log`, `.out`, and diagnostic text files;
- structured runtime JSON such as `runtime.json`, `system.json`, `process.json`, and `metrics.json`;
- `package.json`;
- JavaScript and TypeScript source files;
- an isolated workspace Git log and the latest commit diff.

Mission include and exclude patterns determine which filesystem artifacts may be read. `.env`, `.git` internals, `node_modules`, generated `.ants` output, symlinks, device files, and paths outside the canonical workspace are denied by default.

## Detectors

The first deterministic detector set covers:

- Node.js JavaScript-heap exhaustion;
- port conflicts (`EADDRINUSE`);
- disk exhaustion (`ENOSPC`);
- missing modules (`MODULE_NOT_FOUND`);
- unhandled errors and rejected promises.

Memory analysis correlates fatal logs, runtime heap pressure, whole-file reads, Buffer copies, retained collections, and recent Git changes.

## Output

A completed run writes:

- `report.md`;
- `report.json`;
- `evidence.jsonl`;
- `hypotheses.json`;
- `graph.json`;
- `audit.json`.

Evidence records include provenance, hashes, integrity, sensitivity, redaction metadata, and independence groups. Reports include ranked hypotheses, contradictions, validation outcomes, recommendations, limitations, task history, tool audit events, and budget usage.

## Confidence

Confidence is a deterministic engineering heuristic based on evidence strength, source independence, coverage, temporal relevance, and contradiction penalties. It is not a statistical probability and must not be presented as one.

## Safety boundaries

1. Only `read-only` local missions are accepted.
2. Write, execute, and delete mission permissions are rejected.
3. No general shell tool exists.
4. Git commands use fixed argument arrays with prompting disabled.
5. Filesystem reads use canonical paths and reject symlinks and path escape.
6. Secret-like values are redacted. Missions configured with `pauseOnSecretDetection` stop deeper analysis.
7. Reports are the only files written, and they are written to the selected output directory.
8. Every tool call is recorded in the audit trail.

## Known limitations

- The detector set is intentionally narrow.
- The MVP requires an isolated `.git` directory inside the workspace for Git evidence.
- It does not attach to live processes or collect heap profiles.
- It does not understand arbitrary binary logs.
- It performs no cloud, CI, or remote repository access.
- It proposes corrective steps but does not apply them.
