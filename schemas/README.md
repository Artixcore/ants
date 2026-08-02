# Ants JSON Schemas

These JSON Schema Draft 2020-12 documents are the machine-readable contracts for the Phase 2 architecture.

| Schema | Purpose |
| --- | --- |
| [`mission.schema.json`](mission.schema.json) | Mission objective, mode, scope, permissions, budgets, stop conditions, reporting, and requester |
| [`evidence.schema.json`](evidence.schema.json) | Evidence content, provenance, integrity, sensitivity, independence, transformation, and redaction |
| [`hypothesis.schema.json`](hypothesis.schema.json) | Hypothesis state, support, contradictions, confidence, falsification, and validation |
| [`tool-call.schema.json`](tool-call.schema.json) | Tool Gateway request identity, target, operation, idempotency, risk, and approval reference |
| [`agent-message.schema.json`](agent-message.schema.json) | Versioned internal command and event envelope |
| [`provider-request.schema.json`](provider-request.schema.json) | Provider-neutral model request, capabilities, context, limits, and data policy |

## Versioning

Contract versions begin at `1.0.0` and follow semantic versioning:

- patch: clarifications that do not change valid meaning;
- minor: backward-compatible optional fields or values;
- major: incompatible changes.

Persisted records must retain the schema version under which they were created.

## Validation

The current test suite checks that every schema is valid JSON, identifies Draft 2020-12, and preserves the expected top-level safety constraints. Full semantic JSON Schema validation will be added with the Phase 3 parser.

Run:

```bash
npm run check
```

## Examples

Matching records are available under [`../examples`](../examples/README.md).
