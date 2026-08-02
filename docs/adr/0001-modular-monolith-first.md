# ADR 0001: Begin as a Modular Monolith

Status: **Accepted**

Date: **2026-08-02**

## Context

Ants will eventually benefit from isolated workers and durable queues, but Phase 3 must prove the investigation model before carrying distributed-systems complexity.

## Decision

The first implementation will run as a single Node.js process with strongly separated modules for missions, scheduling, agents, tools, providers, evidence, graph state, policy, and reporting.

Module interfaces will use the same versioned contracts expected in a later distributed deployment. External work remains asynchronous and state records remain serializable.

## Consequences

Positive:

- simpler local installation and debugging;
- lower operating cost;
- deterministic tests;
- faster iteration on evidence and agent contracts;
- no premature queue, service discovery, or network-failure burden.

Negative:

- weaker process isolation initially;
- one process limits horizontal scaling;
- careful boundaries are required to avoid a future rewrite.

## Alternatives considered

- independent microservices from day one;
- serverless function per agent;
- workflow-engine dependency as the foundation.

These remain possible later, but none is justified before the local incident-investigation workflow proves value.
