# ADR 0003: Read-Only Is the Default

Status: **Accepted**

Date: **2026-08-02**

## Context

Ants is intended to inspect cloud systems, repositories, CI pipelines, databases, and runtime environments. A mistaken write in any of those environments can cause data loss, outage, security exposure, or unexpected cost.

## Decision

All missions default to `read-only`. Write, execute, and delete permissions are absent unless explicitly granted. Controlled actions require deterministic policy evaluation and exact approval when policy requires it.

Phase 3 will implement no production remediation path.

## Consequences

Positive:

- safer evaluation and adoption;
- simpler permission design;
- reduced blast radius from hallucination or prompt injection;
- easier reproducibility and audit;
- clear separation between diagnosis and execution.

Negative:

- users must act on recommendations manually at first;
- some incident recovery flows take longer;
- later remediation support requires a separate security milestone.

## Alternatives considered

- full autonomous access with rollback;
- write access enabled by default in non-production;
- one broad operator credential shared by all agents.

These alternatives create unacceptable early-stage risk.
