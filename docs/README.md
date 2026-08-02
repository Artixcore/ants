# Ants Documentation

Phase 2 defines the normative architecture for Ants. The investigation engine is not yet implemented, but its boundaries, records, permissions, security model, and extension contracts are now specified.

The words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** in normative documents describe requirement strength.

## Core specifications

- [System architecture](architecture.md): components, data flow, lifecycle, consistency, failure model, deployment profiles, and invariants.
- [Agent roles](agents.md): role responsibilities, permissions, task leasing, context minimization, and validation independence.
- [Mission contract](mission.md): mission schema, modes, scope, budgets, stop conditions, lifecycle, and amendments.
- [Evidence and hypotheses](evidence.md): provenance, confidence, independence, contradiction, pheromone scoring, and reporting rules.
- [Investigation graph](investigation-graph.md): node and edge model, temporal relationships, source chains, and graph queries.
- [Tool Gateway](tools.md): risk classes, sandboxing, authorization, idempotency, cloud and shell controls.
- [Provider adapters](providers.md): provider-neutral model requests, capability negotiation, credential handling, cost, and fallback.
- [Security model](security.md): trust boundaries, threats, approval policy, secrets, audit controls, and security testing.
- [Memory model](memory.md): working, mission, historical, and static memory with retention and promotion rules.
- [Cloud architecture](cloud.md): normalized cloud resources, evidence collection, identity, scope, rate limits, and AWS-first direction.
- [Internal API and events](api.md): commands, events, queries, envelopes, errors, delivery, and versioning.

## Machine-readable contracts

- [`mission.schema.json`](../schemas/mission.schema.json)
- [`evidence.schema.json`](../schemas/evidence.schema.json)
- [`hypothesis.schema.json`](../schemas/hypothesis.schema.json)
- [`tool-call.schema.json`](../schemas/tool-call.schema.json)
- [`agent-message.schema.json`](../schemas/agent-message.schema.json)
- [`provider-request.schema.json`](../schemas/provider-request.schema.json)

All schemas use JSON Schema Draft 2020-12 and begin at contract version `1.0.0`.

## Architecture decisions

See the [Architecture Decision Record index](adr/README.md).

Accepted decisions currently cover:

- modular monolith first;
- structured evidence instead of agent chat as shared truth;
- read-only operation by default;
- provider-neutral core contracts.

## Examples

- [Local Node.js failure mission](../examples/missions/node-service-failure.json)
- [Memory-series evidence record](../examples/evidence/memory-series.json)
- [Validated image-memory hypothesis](../examples/hypotheses/image-buffer-growth.json)

## Implementation status

Phase 2 is complete as a specification milestone. Phase 3 will implement a local, read-only incident-investigation MVP that consumes logs, system metadata, source code, and Git history.

Documentation must describe implemented behavior precisely. Proposed behavior remains labeled as planned or experimental until code and tests prove it.
