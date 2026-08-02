# Contributing to Ants

Thank you for helping build Ants. Contributions should improve evidence quality, bounded execution, operational safety, auditability, tests, or documentation.

## Read first

Before contributing, read:

- [README](README.md)
- [Security policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Roadmap](ROADMAP.md)
- [License](LICENSE)

Large architecture, permission, provider, or data-model changes should begin with an issue. Security vulnerabilities must be reported privately, not through public issues.

## Development setup

Requirements:

- Node.js 20 or newer
- npm 10 or newer
- Git for Git-related tests and the demo

```bash
git clone https://github.com/Artixcore/ants.git
cd ants
npm ci
npm run check
npm run security:audit
```

Run the demo:

```bash
npm run demo
```

## Branch and commit guidance

- Create a focused branch from `master`.
- Keep each pull request limited to one coherent change.
- Use clear imperative commit messages.
- Add regression tests for bug and security fixes.
- Update documentation, examples, schemas, and changelog entries when behavior changes.
- Do not commit generated `.ants` reports.

## Security requirements

Contributions must not:

- add general-purpose shell execution;
- interpolate untrusted values into command strings;
- follow symlinks outside approved roots;
- read an entire unbounded file into memory;
- write outside the protected artifact root;
- bypass the Tool Gateway or mission policy;
- weaken secret redaction or error normalization;
- expose environment variables, credentials, or private customer data;
- silently broaden permissions when an operation fails.

New tools should use typed arguments, explicit permission checks, fixed time and output limits, safe error handling, and audit events.

## Test expectations

At minimum, run:

```bash
npm run lint
npm test
npm run security:audit
```

Behavioral changes should test success, malformed input, permission denial, boundary conditions, and failure cleanup. Security-sensitive changes should include an adversarial regression test.

Fixtures must use synthetic data. Never commit real tokens, private logs, customer identifiers, or proprietary code.

## Pull-request checklist

- [ ] The change is permitted by the repository license.
- [ ] The change is focused and explained.
- [ ] No secrets or sensitive data are included.
- [ ] `npm run check` passes.
- [ ] `npm run security:audit` passes.
- [ ] New behavior and failure cases are tested.
- [ ] Permission, path, output, and error-handling effects were reviewed.
- [ ] Documentation and changelog entries are updated when necessary.

## Licensing of contributions

By submitting a contribution, you confirm that you have the right to submit it and agree that Artixcore may distribute it under this repository's existing license and notices. Contributing does not grant commercial rights to the project.
