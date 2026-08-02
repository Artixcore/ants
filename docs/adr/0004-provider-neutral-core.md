# ADR 0004: Keep the Core Provider-Neutral

Status: **Accepted**

Date: **2026-08-02**

## Context

Language-model and cloud providers differ in capabilities, pricing, retention, availability, and policy. Binding core agent logic to one provider would create lock-in and make sensitive or local deployments difficult.

## Decision

Core missions, agents, evidence, hypotheses, tools, and reports use provider-neutral contracts. Model and cloud integrations live behind adapters that expose capabilities, normalized responses, usage, errors, and provenance.

Provider selection is a deterministic routing and policy decision, not an agent decision.

## Consequences

Positive:

- hosted and local models can coexist;
- users may bring their own approved credentials;
- data policy can select an appropriate provider;
- cloud adapters can share the same investigation model;
- provider failures do not define the core state format.

Negative:

- lowest-common-denominator contracts can hide provider-specific strengths;
- adapters require maintenance;
- structured-output differences require normalization and repair logic.

## Alternatives considered

- OpenAI-only core;
- provider SDK objects stored directly as mission state;
- agent-selected providers without routing policy.

These alternatives reduce portability and weaken governance.
