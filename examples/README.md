# Ants Examples

## Runnable incident

[`incidents/node-memory-crash/`](incidents/node-memory-crash/) is the Phase 3 deterministic end-to-end fixture.

Run it with:

```bash
npm run demo
```

The demo:

1. copies a small Node.js service into a temporary workspace;
2. creates a baseline streaming-upload commit;
3. creates a regression commit that buffers and retains uploads;
4. supplies failure logs and runtime diagnostics;
5. runs the full Scout, Investigator, Validator, and Reporter workflow;
6. writes Markdown and JSON investigation artifacts.

## Contract examples

- [`missions/node-service-failure.json`](missions/node-service-failure.json)
- [`evidence/memory-series.json`](evidence/memory-series.json)
- [`hypotheses/image-buffer-growth.json`](hypotheses/image-buffer-growth.json)

These illustrate Phase 2 data contracts and are not a substitute for the runnable incident fixture.

Never commit real customer logs, credentials, tokens, private repository content, or sensitive infrastructure identifiers.
