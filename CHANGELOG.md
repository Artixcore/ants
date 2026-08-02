# Changelog

All notable project changes are documented here.

The project follows semantic versioning for public project milestones.

## [Unreleased]

### Planned

- Phase 4 repository and CI integrations.

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
