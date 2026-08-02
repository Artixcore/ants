# Phase 3 Local Incident-Investigation MVP

Status: **Implemented and security-hardened in v0.3.1**

The Phase 3 engine converts the Phase 2 contracts into a bounded, deterministic investigation workflow for local Node.js services.

## Workflow

```text
Mission JSON
    -> strict validation
    -> canonical workspace and protected output root
    -> scoped filesystem and optional Git tools
    -> Scout collection
    -> Investigator hypothesis ranking
    -> Validator cross-source challenge
    -> Reporter persistence
```

The engine reads local artifacts only. It does not call hosted language models, access the network, execute arbitrary shell strings, mutate evidence files, or perform remediation.

## CLI

Validate a mission:

```bash
node src/cli.js validate ./mission.json
```

Investigate a workspace with the default output path:

```bash
node src/cli.js investigate ./mission.json --workspace ./service
```

Choose an output directory beneath the workspace `.ants` root:

```bash
node src/cli.js investigate ./mission.json \
  --workspace ./service \
  --output .ants/manual-run
```

Run the deterministic example:

```bash
npm run demo
```

## Mission validation

Phase 3 requires:

- schema version `1.0.0`;
- `read-only` mode;
- `local` environment;
- at least one filesystem permission;
- only `discover`, `read`, or `analyze` operations;
- safe relative include, exclude, and permission patterns;
- finite integer budgets within defined limits;
- valid stop conditions, reporting flags, requester information, and timestamps;
- no unknown fields in implemented mission objects;
- a one MiB mission-file size limit and no symbolic-link mission paths.

Absolute path patterns, `..` traversal, null bytes, unsupported resource types, write permissions, and malformed nested values are rejected.

## Inputs

The MVP can inspect:

- `.log`, `.out`, and diagnostic text files;
- runtime JSON such as `runtime.json`, `system.json`, `process.json`, and `metrics.json`;
- `package.json`;
- JavaScript and TypeScript source files;
- an isolated workspace Git log and latest commit diff.

Mission scope and permission scope are enforced separately. A file must pass both.

`.env`, `.git` internals, `node_modules`, `.ssh`, private-key files, generated `.ants` output, symlinks, device files, absolute paths, traversal paths, and paths outside the canonical workspace are denied by default.

## Bounded file handling

File reads:

- open the final file without following the final symlink on supported platforms;
- compare file identity before and after opening;
- allocate only the permitted prefix;
- enforce the mission byte budget before reading;
- cap each file at one MiB by default;
- identify NUL-containing input as binary and avoid text analysis;
- redact secret-like values before evidence storage.

## Git handling

Git analysis is optional and runs only when the mission grants Git permission and the workspace contains a non-symlink `.git` directory.

The Git adapter:

- uses fixed argument arrays;
- disables external diff commands and text-conversion filters;
- disables pagers, prompts, optional locks, hooks, and filesystem monitors;
- ignores system and global Git configuration;
- inherits only a limited environment;
- caps execution time and output size;
- redacts secret-like output;
- records failed and successful calls in the audit trail.

Git worktrees represented by a `.git` file are not supported in Phase 3.

## Detectors

The first deterministic detector set covers:

- Node.js JavaScript-heap exhaustion;
- port conflicts (`EADDRINUSE`);
- disk exhaustion (`ENOSPC`);
- missing modules (`MODULE_NOT_FOUND`);
- unhandled errors and rejected promises.

Memory analysis correlates fatal logs, runtime heap pressure, whole-file reads, Buffer copies, retained collections, and recent Git changes.

## Output

Reports may be written only under `<workspace>/.ants/`.

A run can write:

- `report.md`;
- `report.json`;
- `evidence.jsonl`;
- `hypotheses.json`;
- `graph.json`;
- `audit.json`.

Output path components may not be symlinks. Artifacts use exclusive random temporary files, restrictive file permissions, synchronization, and atomic replacement.

## Error handling

- Tool failures are normalized before they reach reports or terminal output.
- Common secret formats are redacted from errors.
- ANSI and dangerous control characters are removed.
- Authorization failures are audited.
- Budget exhaustion produces a partial report when the output boundary is still safe.
- The Reporter task is budget-exempt so safety reporting is not blocked by an exhausted investigation budget.
- A report-write failure remains fatal because Ants must not claim that an audit artifact exists when persistence failed.

## Secret behavior

When secret-like content is detected:

- the raw value is not stored;
- a security evidence record describes the category and count;
- redacted content may be analyzed only when `pauseOnSecretDetection` is `false`;
- deeper collection stops when `pauseOnSecretDetection` is `true`.

Pattern-based detection cannot identify every secret format.

## Confidence

Confidence is a deterministic engineering heuristic based on evidence strength, source independence, coverage, temporal relevance, and contradiction penalties. It is not a statistical probability.

## Known limitations

- The detector set is narrow.
- The MVP does not attach to live processes or collect heap profiles.
- It does not understand arbitrary binary logs.
- Git subprocesses are bounded but not placed in a separate operating-system container.
- It performs no cloud, CI, network, or remote repository access.
- It proposes corrective steps but does not apply them.
