# Ants Roadmap

The roadmap is directional, not a promise of delivery dates. Safety, reproducibility, and defensible evidence take priority over feature count.

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

## Phase 3: Local incident-investigation MVP

Status: **Complete**

- Strict local read-only mission parser and validation
- Mission Controller and bounded task scheduler
- Scout, Investigator, Validator, and Reporter roles
- Scoped filesystem and Git Tool Gateway
- Log, runtime, source, package, Git-log, and recent-diff collection
- Secret redaction, canonical-path sandboxing, and symlink denial
- Structured evidence store with provenance and hashes
- Persistent investigation graph
- Ranked hypotheses with independence and contradiction scoring
- Deterministic cross-source validation
- Budget-exhaustion partial reporting
- Markdown and JSON reports
- Tool audit trail
- Reproducible Node.js heap-exhaustion fixture
- End-to-end CLI and safety tests

## Phase 4: Repository and CI integrations

Status: **Next**

Target mission: investigate a failing repository or CI run using a pinned Git ref and sanitized workflow artifacts.

- GitHub repository adapter
- Remote commit, pull-request, and issue metadata
- GitHub Actions workflow, job, step, and log analysis
- Commit and deployment correlation
- Repository dependency and test-failure evidence
- Pull-request and issue report publishing in propose mode
- Secret-safe artifact collection
- Rate-limit and pagination policies
- Evaluation fixtures for failed Node.js CI pipelines

## Phase 5: Cloud observability integrations

- AWS CloudWatch-first read-only integration
- EC2, ECS, Lambda, RDS, load balancer, and deployment evidence
- CloudTrail and IAM-context collection
- Incident timelines and recommended remediations
- Cost and security investigation modes
- Provider-normalized cloud resource graph

## Phase 6: Controlled remediation

- Deterministic policy engine and action allowlists
- Human approval workflow with bound approval tokens
- Reversible low-risk actions
- Proposed patches and pull requests
- Rollback verification and post-action monitoring
- Full mutation audit trail
- Explicit denial of destructive actions by default
