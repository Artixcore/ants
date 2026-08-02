# Security Policy

Ants reads potentially hostile repositories, logs, and diagnostic artifacts. Security reports are taken seriously, but the project remains experimental and is not approved for autonomous production changes.

## Supported versions

| Version | Security support |
| --- | --- |
| `0.3.1` and current `master` | Supported |
| `0.3.0` | Upgrade required |
| `0.2.x` and older | Not supported |

Security fixes target the newest release and `master`. Backports are not guaranteed.

## Reporting a vulnerability

Do **not** open a public issue for a vulnerability involving command execution, path escape, credential exposure, arbitrary file writes, privilege escalation, denial of service, evidence tampering, or another immediately exploitable condition.

Use one of these private routes:

1. GitHub's private vulnerability-reporting or security-advisory interface for this repository, when available.
2. Email `ismam.ceo@artixcore.com` with the subject `Ants Security Report`.

Include:

- affected version, file, or commit;
- a concise impact statement;
- safe reproduction steps;
- expected and observed behavior;
- suggested mitigation, when known;
- whether the issue is already being exploited.

Never include live credentials, private keys, seed phrases, customer data, or production secrets. Use synthetic test values.

## Response process

Artixcore will aim to:

1. acknowledge a complete report;
2. reproduce and classify the issue;
3. prepare a fix and regression test;
4. coordinate disclosure when material risk exists;
5. publish release notes after users have a reasonable upgrade path.

Response times are best-effort because Ants is an early-stage project.

## Phase 3 security boundaries

The current implementation:

- accepts local read-only missions only;
- rejects absolute and parent-traversal scope patterns;
- enforces mission and permission scopes;
- canonicalizes workspace and file paths;
- rejects symlinked workspace roots, evidence files, and report directories;
- excludes common secret paths and private-key files by default;
- caps file reads before memory allocation;
- treats binary files as non-text evidence;
- disables Git external diff and text-conversion commands;
- isolates Git configuration and reduces inherited subprocess environment variables;
- uses fixed Git argument arrays with prompting and pagers disabled;
- redacts common credential formats and strips terminal control sequences;
- restricts report writes to `<workspace>/.ants/`;
- writes artifacts through exclusive temporary files and atomic replacement;
- records tool attempts and normalized errors;
- performs no remediation, network access, or arbitrary shell execution.

## Security limitations

- Pattern-based secret detection is not complete.
- Deterministic source analysis may produce false positives and false negatives.
- Git subprocesses are bounded by time and output, but they do not run inside a separate operating-system container.
- A user who runs Ants with excessive operating-system privileges gives the process those same privileges.
- Phase 3 does not verify signed commits, release signatures, or artifact provenance.
- Hosted model providers and cloud credentials are not implemented in Phase 3.

Run Ants as an unprivileged user against a copy or snapshot of important evidence whenever possible.

## Dependency and supply-chain policy

- Keep runtime dependencies minimal.
- Commit and review lockfile changes.
- Run `npm run security:audit` before release.
- Review automated dependency updates before merging.
- Do not add install scripts without explicit security review.
- Changes to `src/security`, `src/tools`, workflows, permissions, or output handling require focused review and tests.
