# Ants Roadmap

The roadmap is directional, not a promise of delivery dates. Safety and verifiable behavior take priority over feature count.

## Phase 1: Repository foundation

Status: **Complete**

- Project identity, license, and donation information
- Node.js package metadata
- CLI and source scaffolding
- Tests and continuous integration
- Contribution and security policies
- Issue and pull-request templates

## Phase 2: Architecture specification

Status: **Complete**

- Mission schema, modes, budgets, scope, stop conditions, amendments, and lifecycle
- Agent roles, permissions, task leasing, context minimization, and independence rules
- Evidence, provenance, integrity, sensitivity, contradiction, and confidence models
- Hypothesis lifecycle and validation outcomes
- Investigation graph nodes, edges, temporal model, and pheromone projection
- Tool Gateway contracts, risk classes, sandbox boundaries, and idempotency
- Provider-neutral model adapter and capability routing
- Cloud-provider adapter boundary and normalized resource model
- Working, mission, historical, and static memory rules
- Threat model, approval matrix, secrets policy, and audit controls
- Internal command, event, query, error, and versioning contracts
- JSON Schema contracts and deterministic architecture fixtures
- Architecture Decision Records
- CI tests for Phase 2 documents, schemas, and examples

## Phase 3: Local incident-investigation MVP

Status: **Next**

Target mission: explain why a Node.js service failed using local logs, system metadata, source code, and Git history.

- Mission parser and schema validation
- Mission Controller
- Task scheduler and bounded worker runs
- Scout, Investigator, Validator, and Reporter roles
- Read-only filesystem, Git, log, and runtime tools
- Structured evidence store
- Investigation graph persistence
- Ranked hypotheses with contradictions and confidence
- Deterministic sample incident and evaluation suite
- Markdown and JSON reports
- Read-only CLI workflow

## Phase 4: Repository and CI integrations

- GitHub repository inspection
- Commit and deployment correlation
- GitHub Actions failure analysis
- Pull-request and issue reporting
- Secret-safe evidence collection

## Phase 5: Cloud observability integrations

- AWS CloudWatch-first read-only integration
- Compute, database, load balancer, and deployment evidence
- Incident timelines and recommended remediations
- Cost and security investigation modes

## Phase 6: Controlled remediation

- Policy engine and explicit action allowlists
- Human approval workflow
- Reversible low-risk actions
- Rollback verification and post-action monitoring
- Full audit trail
