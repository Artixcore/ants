# Node.js memory-crash fixture

This deterministic fixture represents a Node.js upload service that regressed from streaming to full-file buffering and unbounded in-memory retention.

Run it through Ants:

```bash
npm run demo
```

The demo command copies the service to a temporary directory, creates a two-commit Git history, runs the read-only investigation, and writes Markdown and JSON reports.

Expected leading conclusion: the service exhausted its JavaScript heap while buffering and retaining uploads.
