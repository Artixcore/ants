# Provider-Neutral Model Adapter

Status: **Normative for Phase 2**

Ants must not bind its architecture to one language-model vendor. Provider adapters translate the internal request contract into provider-specific calls and normalize responses, usage, errors, and capabilities.

## 1. Design goals

The adapter layer MUST:

- support multiple hosted and local model providers;
- keep provider-specific SDKs outside core agent logic;
- expose capability negotiation;
- normalize structured output and tool-request behavior;
- account for tokens, cost, latency, and retries;
- support user-provided credentials without exposing them to agents;
- make provider substitution possible without changing mission or evidence contracts;
- preserve a complete audit record without storing secret keys.

## 2. Adapter identity

Every adapter MUST declare:

- adapter ID and semantic version;
- provider name;
- supported model identifiers;
- supported capabilities;
- context and output limits;
- supported authentication modes;
- data-residency or endpoint configuration options;
- retry and rate-limit behavior;
- pricing metadata source and timestamp when cost estimation is enabled.

## 3. Capability model

Capabilities MAY include:

- text generation;
- structured JSON output;
- tool selection;
- image input;
- file input;
- streaming;
- deterministic seed support;
- reasoning controls;
- prompt caching;
- local execution;
- data-retention controls.

Core agent roles MUST request capabilities rather than provider-specific features.

Example:

```json
{
  "requires": ["text", "structured-output"],
  "prefers": ["streaming"],
  "forbids": ["external-browsing"]
}
```

## 4. Normalized request

A model request SHOULD include:

- request ID;
- mission, task, and agent run IDs;
- role and role version;
- system policy reference;
- task instructions;
- bounded context items;
- output schema;
- allowed tool descriptors, if any;
- temperature or determinism preference;
- maximum output tokens;
- timeout;
- sensitivity classification;
- data-handling constraints.

Raw credentials MUST NOT appear in the request object.

## 5. Normalized response

A response MUST include:

- request ID;
- provider and model;
- adapter version;
- status;
- parsed structured output or text;
- finish reason;
- usage metrics;
- estimated cost when available;
- provider request ID;
- latency;
- retries;
- validation errors;
- safety or refusal metadata;
- raw response reference when retention policy permits it.

Model text MUST be treated as untrusted until schema validation succeeds.

## 6. Structured output

Ants SHOULD use schema-constrained output for agent results.

Adapters MAY use provider-native structured output, tool calls, or a parser fallback. Regardless of mechanism, the adapter MUST:

1. validate the result against the requested schema;
2. reject unknown high-impact fields when strict mode is enabled;
3. preserve the original response reference for debugging when policy permits;
4. perform bounded repair attempts;
5. return a typed failure after repair limits are exhausted.

A repaired response MUST record that repair occurred and which model or parser performed it.

## 7. Provider routing

Routing is deterministic policy plus mission preferences. A model does not select itself.

Routing MAY consider:

- required capabilities;
- data sensitivity;
- permitted providers;
- context size;
- latency target;
- mission budget;
- role quality requirement;
- provider availability;
- local versus hosted preference.

A route decision MUST be auditable.

## 8. Role quality tiers

A deployment MAY define tiers such as:

- `economy`: broad scouting and classification;
- `standard`: focused investigation;
- `reasoning`: validation and complex causal analysis;
- `reporting`: final synthesis;
- `local-sensitive`: tasks whose data must remain local.

Tier names are deployment policy, not hardcoded providers.

## 9. Credential handling

Credentials MUST be resolved by the runtime or secret manager and passed directly to the provider client.

Agents and prompts MUST NOT receive API keys, bearer tokens, cloud credentials, or secret-manager values.

User-provided keys SHOULD be stored encrypted or referenced through an external secret manager. Logs MUST contain only credential reference IDs.

## 10. Data handling

Before hosted-provider transmission, context MUST be checked for:

- detected secrets;
- personal data;
- regulated data;
- customer-confidential data;
- mission restrictions;
- provider and region restrictions.

The adapter MUST deny or redact transmission when policy requires it.

## 11. Timeouts, retries, and fallback

Provider calls MUST have deadlines.

Retries SHOULD use bounded exponential backoff for retryable errors. A retry MUST NOT silently switch to a provider with weaker data-handling guarantees.

Fallback to another provider requires:

- compatible capabilities;
- policy permission;
- budget permission;
- sensitivity compatibility;
- an audit event.

## 12. Cost accounting

Every response SHOULD record:

- input tokens;
- output tokens;
- cached tokens when applicable;
- provider-reported usage;
- pricing version or timestamp;
- estimated cost;
- budget ledger entry.

Pricing can change. Estimated cost MUST identify the pricing metadata used and MUST NOT be treated as invoice truth.

## 13. Caching

Provider response caching MAY reduce cost for deterministic, non-sensitive tasks.

Cache keys SHOULD include:

- normalized request hash;
- model and provider;
- adapter version;
- system policy version;
- output schema version;
- sensitivity class;
- expiration policy.

Sensitive or mission-specific responses SHOULD NOT be shared across missions unless policy explicitly allows it.

## 14. Local models

Local adapters MAY support runtimes such as Ollama or other self-hosted inference servers.

Local does not automatically mean safe. The adapter must still enforce:

- endpoint allowlist;
- model identity;
- request limits;
- output validation;
- audit events;
- resource constraints;
- data-retention policy.

## 15. Error taxonomy

Normalized provider errors include:

- authentication;
- permission;
- invalid model;
- unsupported capability;
- context limit;
- rate limit;
- timeout;
- transient availability;
- content rejection;
- malformed structured output;
- budget denial;
- data-policy denial;
- cancelled.

Core logic MUST branch on normalized categories, not vendor error strings.

## 16. Adapter invariants

1. Provider choice is policy-controlled.
2. Credentials never enter agent context.
3. Model output is untrusted until validated.
4. Usage and route decisions are auditable.
5. Fallback cannot weaken data policy.
6. Core records remain provider-neutral.
7. Provider-specific fields are isolated in adapter metadata.
