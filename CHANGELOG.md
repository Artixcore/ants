# Changelog

All notable project changes are documented here.

The project follows semantic versioning for public project milestones.

## [Unreleased]

### Added

- Safe `ants init [mission.json]` command for creating a valid starter mission in the current project.
- Valid root `mission.json` so the documented validation command works immediately after cloning.
- First-run and missing-file regression tests.

### Fixed

- Missing mission files now produce an actionable creation instruction instead of only exposing `ENOENT` details.
- README and local-MVP documentation now explain how to create, validate, and run missions from Git Bash and PowerShell.

### Planned

- Phase 4 repository and CI integrations.

## [0.3.1] - 2026-08-03

### Security

- Prevented oversized files from being loaded fully into process memory before truncation.
- Disabled repository-controlled Git external diff and text-conversion commands.
- Isolated Git configuration, disabled prompts and pagers, and reduced inherited environment variables.
- Restricted report output to the workspace `.ants` directory and rejected symlinked output paths.
- Added exclusive temporary files and atomic artifact replacement.
- Enforced permission scopes in the Tool Gateway and audited malformed or denied calls.
- Expanded secret redaction and removed terminal control sequences from errors and tool output.

### Fixed

- Mission validation now returns structured validation errors instead of throwing incidental type errors for malformed arrays or objects.
- Mission files are bounded to one MiB and symbolic-link mission paths are rejected.
- Mission validation now rejects unknown fields, unsafe path patterns, invalid dates, fractional limits, invalid nested objects, and unsupported Git scopes.
- Secret detection now respects `pauseOnSecretDetection: false` and continues only with redacted content.
- Missions without Git permission no longer fail because the Scout attempted Git tools unconditionally.
- Safety reporting can run after normal task or duration budgets are exhausted.
- Stable hashing now handles `undefined` deterministically and rejects cyclic values clearly.
- The demo now creates a unique workspace instead of risking reuse of an existing `service` directory.

### Added

- Output-path security policy.
- Safe atomic artifact writer.
- Safe error serialization.
- Binary-file detection.
- Adversarial tests for malicious Git diff drivers, output symlinks, traversal, oversized files, permission scopes, terminal controls, and malformed missions.
- Dependabot configuration, code ownership, and CI dependency auditing.

### Changed

- Project version increased to `0.3.1`.
- Project state changed to `local-investigation-mvp-hardened`.
- README, security policy, contributing guide, code of conduct, and local-MVP documentation were revised.

## [0.3.0] - 2026-08-03

### Added

- Runnable local Node.js incident-investigation engine.
- Strict read-only mission validation.
- Mission Controller and bounded task scheduler.
- Scout, Investigator, Validator, and Reporter agents.
- Scoped filesystem and fixed-command Git tools behind a Tool Gateway.
- Canonical-path checks, symlink denial, default secret-path exclusions, and content redaction.
- Log, runtime, source, package, Git-history, and recent-diff evidence collection.
- Immutable evidence records with hashes, provenance, integrity, sensitivity, and independence groups.
- Persistent investigation graph.
- Deterministic root-cause detectors for heap exhaustion, port conflicts, disk exhaustion, missing modules, and unhandled errors.
- Cross-source hypothesis validation and contradiction-aware confidence scoring.
- Markdown and JSON reports, evidence JSONL, hypotheses, graph, and audit output.
- Partial reporting after bounded execution failures.
- Secret-detection pause behavior.
- Deterministic Node.js memory-crash demo with generated Git history.
- Phase 3 implementation and safety documentation.
- End-to-end, CLI, mission, sandbox, redaction, pause, budget, and smoke tests.

### Changed

- Project version increased to `0.3.0`.
- Project state changed to `local-investigation-mvp`.
- Syntax validation now checks all JavaScript files in `src`, `scripts`, and `tests`.
- README and roadmap now document the working MVP and Phase 4 as the next milestone.

## [0.2.0] - 2026-08-02

### Added

- Phase 2 architecture specification.
- Mission, evidence, hypothesis, tool-call, agent-message, and provider-request schemas.
- Architecture Decision Records and deterministic contract fixtures.
- Architecture contract tests.

## [0.1.0] - 2026-08-02

### Added

- Phase 1 repository foundation.
- Artixcore project identity and documentation.
- PolyForm Noncommercial 1.0.0 license.
- Node.js package and CLI scaffolding.
- Contribution, conduct, security, roadmap, issue, pull-request, and CI files.
