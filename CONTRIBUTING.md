# Contributing to Ants

Thank you for helping build Ants. Contributions should strengthen evidence-driven investigation, operational safety, auditability, and documentation.

## Before contributing

1. Read the [README](README.md), [license](LICENSE), [roadmap](ROADMAP.md), and [security policy](SECURITY.md).
2. Search existing issues before opening a duplicate.
3. Discuss large architectural changes in an issue before implementation.
4. Never include credentials, customer data, private logs, proprietary code, or unlicensed material.

## Development setup

Requirements:

- Node.js 20 or newer
- npm 10 or newer

```bash
git clone https://github.com/Artixcore/ants.git
cd ants
npm install
npm run check
```

Run the CLI locally:

```bash
npm start -- --help
```

## Branch and commit guidance

- Create a focused branch from `master`.
- Keep each pull request limited to one coherent change.
- Use clear commit messages written in the imperative form.
- Add or update tests for behavioral changes.
- Update documentation when commands, configuration, or architecture changes.

## Pull-request checklist

- [ ] The change is permitted by the repository license.
- [ ] No secrets or sensitive data are included.
- [ ] `npm run check` passes.
- [ ] New behavior is tested.
- [ ] Safety boundaries and failure modes are documented.
- [ ] The pull request explains what changed and why.

## Licensing of contributions

By submitting a contribution, you confirm that you have the right to submit it and agree that Artixcore may distribute it under this repository's existing license and notices. Commercial rights are not granted merely by contributing.
