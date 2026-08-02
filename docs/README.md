# Ants Documentation

Ants documentation is divided into normative architecture contracts and implemented milestone notes.

## Implemented behavior

- [`local-mvp.md`](local-mvp.md): Phase 3 local incident-investigation engine, CLI, inputs, outputs, detectors, safety boundaries, and limitations.

## Normative architecture

- [`architecture.md`](architecture.md): system boundaries, components, trust model, and data flow.
- [`agents.md`](agents.md): roles, responsibilities, permissions, task leasing, and agent independence.
- [`mission.md`](mission.md): mission schema, budgets, scope, stop conditions, and lifecycle.
- [`evidence.md`](evidence.md): evidence, provenance, integrity, confidence, and contradictions.
- [`investigation-graph.md`](investigation-graph.md): graph nodes, edges, ranking, and persistence.
- [`tools.md`](tools.md): Tool Gateway, risk classes, sandboxing, retries, and approval boundaries.
- [`providers.md`](providers.md): provider-neutral model adapter contracts.
- [`memory.md`](memory.md): working, mission, historical, and static memory.
- [`cloud.md`](cloud.md): future cloud-provider adapter boundary.
- [`security.md`](security.md): threat model, secrets, prompt injection, and control requirements.
- [`api.md`](api.md): commands, events, queries, errors, and versioning.

## Architecture decisions

See [`adr/README.md`](adr/README.md).

## Machine-readable contracts

See [`../schemas/README.md`](../schemas/README.md).

Documentation must distinguish implemented behavior from planned behavior. Phase 3 code implements only local read-only investigation; repository, CI, cloud, and controlled-remediation capabilities remain future work.
