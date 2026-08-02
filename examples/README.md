# Examples

Phase 2 includes deterministic contract examples for the planned local incident-investigation workflow.

## Available examples

### Mission

[`missions/node-service-failure.json`](missions/node-service-failure.json)

A read-only mission that investigates a local Node.js service crash using logs, source code, package metadata, and Git history. It demonstrates scope, exclusions, permissions, budgets, stop conditions, reporting, sensitivity, and provider preferences.

### Evidence

[`evidence/memory-series.json`](evidence/memory-series.json)

A runtime memory-series evidence record with source provenance, collector metadata, integrity state, content hash, sensitivity, independence group, reliability rationale, and redaction metadata.

### Hypothesis

[`hypotheses/image-buffer-growth.json`](hypotheses/image-buffer-growth.json)

A supported hypothesis that cites multiple evidence records and an independent reproduction validation. It demonstrates confidence factors, falsification criteria, missing evidence, alternatives, and affected entities.

## Phase 3 examples

Executable incident fixtures will be added with the Phase 3 local investigator. Each executable example must include:

- a self-contained mission;
- sanitized input data;
- expected evidence and hypothesis output;
- commands required to run it;
- expected limitations and failure cases.

Do not commit real customer logs, credentials, access tokens, private repository content, or sensitive infrastructure identifiers.
