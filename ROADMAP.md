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

- Mission schema and lifecycle
- Agent role and permission model
- Evidence, hypothesis, and confidence schemas
- Investigation graph design
- Tool contracts and sandbox boundaries
- Provider-neutral model adapter
- Threat model and approval policy

## Phase 3: Local incident-investigation MVP

Target mission: explain why a Node.js service failed using local logs, system metadata, source code, and Git history.

- Mission Controller
- Scout, Investigator, Validator, and Reporter roles
- Structured evidence store
- Ranked hypotheses with contradictions and confidence
- Deterministic sample incident and evaluation suite
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
