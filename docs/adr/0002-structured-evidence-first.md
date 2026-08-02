# ADR 0002: Structured Evidence Is Shared Truth

Status: **Accepted**

Date: **2026-08-02**

## Context

Multi-agent systems often pass long natural-language conversations between workers. That pattern is costly, difficult to audit, vulnerable to prompt injection, and likely to turn one agent's unsupported claim into colony consensus.

## Decision

Agents will communicate through structured task results, evidence references, findings, hypotheses, validations, and events. The Evidence Store and Investigation Graph form the shared investigation state.

Free-form peer-to-peer agent chat is not part of the core architecture.

## Consequences

Positive:

- provenance and contradiction remain visible;
- context can be selected per task;
- duplicate source chains can be detected;
- model providers can be changed more easily;
- reports can trace claims to evidence;
- compromised agents have less direct influence over others.

Negative:

- more schemas and validation code are required;
- some useful nuance may need explicit fields or artifacts;
- developers must resist bypassing contracts for convenience.

## Alternatives considered

- shared group chat among agents;
- one global vector memory containing all transcripts;
- controller-only natural-language summaries.

These alternatives may be used as debugging aids, but they cannot become authoritative investigation state.
