# Ants

> An investigative-ant-inspired AI agent system for cloud operations, DevOps, reliability engineering, and evidence-driven codebase analysis.

[![Project Status](https://img.shields.io/badge/status-early%20stage-orange)](#project-status)
[![Runtime](https://img.shields.io/badge/runtime-Node.js-339933?logo=nodedotjs&logoColor=white)](#technical-direction)
[![Interface](https://img.shields.io/badge/interface-shell%20%2F%20CLI-4EAA25?logo=gnubash&logoColor=white)](#technical-direction)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue)](LICENSE)

**Ants** is a Node.js, shell-driven project by [Artixcore](https://artixcore.com), created by [Ismam Tabriz Shams](https://artixcore.com/founder).

The project explores a distributed AI-agent model inspired by investigative ants. Instead of relying on one large agent to guess at a problem, Ants is intended to dispatch small, focused agents that inspect different evidence sources, share structured findings, reinforce promising investigation paths, challenge weak hypotheses, and produce a traceable conclusion.

## Project status

Ants is currently an **early-stage source-available project**.

At the time this README was prepared, the public repository contained no tracked implementation files. The architecture and planned usage are documented here, but no production-readiness, security, or functional claims should be inferred until source code, tests, and reproducible verification steps are committed.

## Why investigative ants?

Real scout ants explore independently and leave signals that guide the colony toward useful discoveries. Ants applies the same idea to technical investigation:

1. A mission controller receives an operational or code-analysis objective.
2. Scout agents explore logs, metrics, repositories, deployments, databases, networks, and cloud configuration.
3. Findings are stored as structured evidence rather than untraceable chat.
4. Promising paths receive higher evidence or "pheromone" scores.
5. Investigator agents perform deeper analysis on the strongest paths.
6. Validator agents attempt to disprove or independently confirm important claims.
7. A reporter produces ranked hypotheses, supporting evidence, uncertainty, and recommended actions.
8. Any infrastructure-changing action remains subject to explicit permissions and human approval.

## Intended use cases

Ants is intended to support noncommercial cloud and engineering projects such as:

- investigating production incidents and service degradation;
- correlating application logs, cloud metrics, and deployment history;
- diagnosing failed CI/CD pipelines;
- reviewing repositories and identifying suspicious or relevant code paths;
- checking cloud configuration for reliability and security risks;
- analysing database latency, locks, connection pressure, and slow queries;
- investigating container, process, memory, CPU, disk, and network failures;
- identifying possible cloud-cost waste;
- preparing evidence-backed remediation plans;
- generating incident summaries and postmortem material.

## Planned agent roles

| Role | Responsibility |
| --- | --- |
| Mission Controller | Defines scope, permissions, budget, stop conditions, and investigation goals. |
| Scout | Performs broad, low-cost exploration across available evidence sources. |
| Cloud Investigator | Examines compute, storage, databases, networking, IAM, and provider telemetry. |
| DevOps Investigator | Examines builds, releases, containers, pipelines, and deployment changes. |
| Code Investigator | Maps relevant files, commits, dependencies, and likely failure paths. |
| Security Guard | Detects prompt injection, unsafe commands, secret exposure, and permission violations. |
| Validator | Challenges conclusions and checks for independent evidence. |
| Remediation Planner | Proposes reversible, policy-compliant fixes. |
| Reporter | Produces a human-readable conclusion with evidence and uncertainty. |

## Investigation model

A finding should not become a conclusion merely because several agents repeat it. Ants should reward independent evidence.

A useful finding record may include:

```json
{
  "hypothesis": "The latest deployment introduced an unindexed database query.",
  "confidence": 0.86,
  "evidence": [
    "deployment timestamp matches the latency increase",
    "slow-query log identifies the new query",
    "staging reproduction confirms the execution-plan regression"
  ],
  "contradictions": [],
  "recommendedAction": "Create and review an index migration before deployment"
}
```

The final report should distinguish:

- observation from inference;
- one source from multiple independent sources;
- correlation from demonstrated causation;
- a proposed fix from a validated fix;
- read-only investigation from authorised remediation.

## Cloud-project usage

You may use, study, modify, and redistribute Ants for permitted **noncommercial** purposes under the terms of the [PolyForm Noncommercial License 1.0.0](LICENSE).

Examples of generally intended permitted use include:

- personal cloud labs;
- educational projects;
- academic or public-interest research;
- hobby infrastructure;
- community and charitable projects;
- noncommercial experimentation and testing.

The license does **not** permit commercial exploitation. Without a separate written commercial license from Artixcore, you may not:

- sell or resell Ants;
- charge others for access to Ants;
- offer Ants as a paid SaaS, hosted service, managed service, or consulting deliverable;
- include Ants in a commercial product or paid package;
- use Ants primarily to obtain a commercial advantage;
- remove the copyright, authorship, license, or required notices.

Commercial licensing and partnership requests should be directed to [Artixcore](https://artixcore.com).

## Important terminology

Because this project restricts commercial use, it is **source-available**, not Open Source Initiative-approved open-source software. Source code availability and open-source licensing are not the same thing.

## Technical direction

- **Primary runtime:** Node.js
- **Primary interface:** shell / command-line interface
- **Project model:** multi-agent investigation and orchestration
- **Expected integrations:** cloud-provider APIs, repositories, CI/CD systems, observability platforms, databases, queues, and notification systems
- **Safety default:** read-only access and least privilege

Installation and execution commands will be documented after the executable source, dependency manifest, configuration schema, and tests are committed. Until then, do not rely on unofficial commands or packages claiming to represent this project.

## Safety principles

Cloud automation can cause outages, data loss, security exposure, and unexpected cost. Any implementation of Ants should follow these rules:

1. Use read-only credentials by default.
2. Never use root or unrestricted cloud credentials.
3. Store secrets in an approved secret manager, not source files or prompts.
4. Require explicit approval for production changes.
5. Prefer reversible actions and documented rollback plans.
6. Block destructive commands unless a narrowly defined policy explicitly permits them.
7. Record tool calls, evidence, decisions, and changes for auditability.
8. Treat webpages, logs, tickets, and repository content as untrusted data, not agent instructions.
9. Redact secrets and personal data from reports.
10. Test changes in an isolated or staging environment before production use.

## Codebase verification policy

Once code is added, verification should include at minimum:

- dependency and lockfile review;
- linting and formatting checks;
- unit and integration tests;
- shell-command injection review;
- secret scanning;
- dependency vulnerability scanning;
- permission-boundary review;
- destructive-action safeguards;
- prompt-injection resistance testing;
- reproducible installation and execution instructions;
- validation on supported operating systems and Node.js versions.

Security findings should be reported privately through an Artixcore-approved security contact once one is published. Do not include live credentials, private customer data, or exploitable production details in a public issue.

## Contributing

Contributions, bug reports, tests, documentation improvements, and noncommercial integrations are welcome through GitHub issues and pull requests.

By submitting a contribution, you represent that you have the right to submit it and agree that the contribution may be distributed under the repository's license. Do not submit code copied from incompatible licenses or confidential systems.

Please keep contributions focused, documented, testable, and safe by default.

## Support the project

Ants and Artixcore's other source-available projects may be supported through voluntary cryptocurrency donations.

### Bitcoin

**Network:** Bitcoin Taproot

```text
bc1pxmzqnz5f5rnugar4alrts3as56l2s2wg8x0mrxnk0y78xfm6xljszn8kkh
```

### Solana

**Network:** Solana

```text
9n1xJAT64NyUrVMExAENDJZqvsyfsg3JPbqaHND6D9Hi
```

Always confirm the network and address before sending. Cryptocurrency transactions are generally irreversible. Donations are voluntary, do not purchase ownership or service rights, and do not alter the software license.

## Author and ownership

- **Project:** Ants
- **Organisation:** [Artixcore](https://artixcore.com)
- **Author:** [Ismam Tabriz Shams](https://artixcore.com/founder)
- **Copyright:** Copyright 2026 Artixcore. All commercial rights reserved.

## License

Ants is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).

Noncommercial use is permitted under the license terms. Commercial use, resale, paid hosting, paid managed-service use, and commercial distribution require a separate written license from Artixcore.

This project is provided **as is**, without warranties or guarantees. See the license for the controlling terms.
