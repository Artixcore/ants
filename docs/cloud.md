# Cloud Integration Architecture

Status: **Normative for Phase 2**

Ants supports cloud investigation through provider adapters behind the Tool Gateway. Cloud integrations are read-only by default and expose normalized resource, metric, event, identity, cost, and configuration evidence.

## 1. Provider boundary

Core agent logic MUST NOT call AWS, Azure, Google Cloud, DigitalOcean, Cloudflare, or another provider SDK directly.

A cloud adapter translates normalized tool operations into provider APIs and returns normalized evidence with provider metadata preserved.

## 2. Initial capability groups

### Inventory

- list scoped resources;
- read resource configuration;
- resolve relationships and tags;
- identify region, account, project, or subscription.

### Observability

- query metrics;
- search logs;
- read traces where configured;
- read alarms and alert history;
- inspect health and status events.

### Change history

- deployments;
- configuration changes;
- identity and policy changes;
- infrastructure-as-code plans or runs;
- provider audit events.

### Cost

- scoped usage and estimated cost;
- idle or underused resource signals;
- retention and data-transfer indicators;
- allocation tags and ownership gaps.

### Security posture

- public exposure;
- identity policy metadata;
- encryption configuration;
- logging coverage;
- security-group or firewall relationships;
- detected configuration drift.

## 3. Normalized resource model

A cloud resource SHOULD contain:

```json
{
  "provider": "aws",
  "accountScope": "123456789012",
  "region": "ap-southeast-1",
  "resourceType": "compute.instance",
  "resourceId": "arn:aws:ec2:ap-southeast-1:123456789012:instance/i-example",
  "name": "api-production-1",
  "environment": "production",
  "tags": {},
  "relationships": [],
  "collectedAt": "2026-08-02T19:00:00Z"
}
```

Provider-native identifiers and request IDs MUST be retained for provenance.

## 4. Normalized resource categories

Core categories include:

- `compute.instance`;
- `compute.container-service`;
- `compute.function`;
- `database.relational`;
- `database.nosql`;
- `storage.object`;
- `storage.block`;
- `network.load-balancer`;
- `network.gateway`;
- `network.firewall`;
- `network.dns`;
- `identity.principal`;
- `identity.policy`;
- `observability.log-source`;
- `observability.metric-source`;
- `deployment.release`;
- `queue`;
- `secret-reference`.

Adapters MAY add provider-specific categories, but reports SHOULD use normalized categories where possible.

## 5. Authentication

Cloud adapters SHOULD use:

- short-lived role assumption;
- workload identity;
- managed identity;
- service-account impersonation;
- narrowly scoped API tokens when stronger native identity is unavailable.

Static administrator keys are not an acceptable default.

The adapter MUST record the effective identity and authorization scope without storing secret values.

## 6. Read-only verification

A deployment SHOULD verify at startup that the configured identity lacks mutation permissions beyond policy.

When a provider cannot guarantee read-only behavior for an API, the tool must use the actual risk class rather than the method name.

## 7. Scope

Cloud mission scope SHOULD bind:

- provider;
- organization or tenant;
- account, subscription, or project;
- region or location;
- resource prefixes or exact identifiers;
- environment tags;
- time range;
- allowed API capability groups.

Cross-account or cross-project investigation requires explicit scope for each boundary.

## 8. Evidence collection

Cloud evidence MUST include:

- provider;
- account, project, or subscription;
- region;
- resource ID;
- API or query operation;
- provider request ID when available;
- source time range;
- collection time;
- effective identity;
- truncation and pagination status;
- independence group.

Pagination MUST be completed or explicitly marked partial.

## 9. Time and correlation

Cloud sources often differ in delivery delay and aggregation windows.

Adapters SHOULD preserve:

- source event time;
- ingestion time;
- collection time;
- metric period;
- known delivery delay;
- timezone and clock assumptions.

The investigation graph must not treat differently aggregated samples as exact point-in-time matches.

## 10. Provider rate limits and cost

Adapters MUST respect provider rate limits and mission budgets.

Collection plans SHOULD:

- begin with low-cost metadata;
- narrow time and resource scope before large log queries;
- cache safe repeated reads;
- expose estimated query cost where providers charge for scans;
- stop or request approval before an unexpectedly expensive query.

## 11. Cloud-specific prompt injection

Tags, resource names, log messages, dashboard annotations, and incident notes are untrusted content. Text such as "ignore policy" or "run this command" must never change permissions or tool behavior.

## 12. Controlled actions

Cloud mutation is outside Phase 3 and disabled by default.

A future controlled cloud action must define:

- exact provider API operation;
- exact resource target;
- preconditions;
- risk class;
- estimated impact and cost;
- approval requirement;
- idempotency behavior;
- rollback procedure;
- post-action verification;
- timeout and partial-failure behavior.

## 13. AWS-first implementation path

The first cloud implementation is expected to be AWS read-only and may cover:

- CloudWatch Logs and Metrics;
- EC2 or ECS inventory and status;
- RDS metadata and metrics;
- Application Load Balancer metrics;
- CloudTrail change events;
- IAM metadata without secret material.

This direction does not change the provider-neutral core contracts.

## 14. Cloud invariants

1. Core agents never call provider SDKs directly.
2. Cloud access is read-only by default.
3. Identity is short-lived and least-privilege where possible.
4. Every record retains provider provenance.
5. Pagination and partial results are visible.
6. Expensive queries consume explicit mission budget.
7. Cloud text fields are untrusted data.
8. Mutations require separate policy, approval, rollback, and verification.
