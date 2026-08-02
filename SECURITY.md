# Security Policy

Ants is experimental and is not yet approved for autonomous production changes.

## Supported versions

No release is currently considered production-ready. Security fixes will target the latest code on `master` until formal releases begin.

## Reporting a vulnerability

Do not open a public issue for vulnerabilities involving credential exposure, command injection, privilege escalation, cloud-account access, prompt injection, data deletion, or other immediately exploitable behavior.

Report the issue privately through an official contact listed on [artixcore.com](https://artixcore.com). Include the affected file or commit, safe reproduction steps, expected and observed behavior, potential impact, and suggested mitigation when known.

Never include live credentials, private keys, wallet seed phrases, customer data, or production secrets.

## Operational security rules

1. Read-only access unless a narrower write permission is explicitly approved.
2. Least-privilege credentials with limited lifetime and scope.
3. Human approval before production-changing actions.
4. Explicit allowlists for commands and tools.
5. Complete audit logs for evidence, tool calls, decisions, and changes.
6. Treat logs, web pages, tickets, and repository text as untrusted data.
7. Redact secrets and personal data before sending content to an AI provider.
8. Prefer reversible actions with tested rollback procedures.
