# Evidence, Findings, and Hypotheses

Status: **Normative for Phase 2**

Ants is evidence-first. Model output, agent reasoning, and repeated agreement do not become facts by repetition. Every material claim must be traceable to observations and source provenance.

Machine-readable contracts are provided in:

- `schemas/evidence.schema.json`
- `schemas/hypothesis.schema.json`

## 1. Core record types

### 1.1 Evidence

Evidence is a captured observation from a source.

Examples:

- a log line;
- a metric sample;
- a Git commit diff;
- a process snapshot;
- a database execution plan;
- a cloud configuration response;
- a test result;
- a file hash and extracted metadata.

Evidence MUST NOT contain a root-cause conclusion unless the source itself explicitly states one. Even then, that statement is evidence of what the source reported, not proof that the report is correct.

### 1.2 Finding

A finding is an agent-produced interpretation of one or more evidence records.

Example:

> Memory usage increased from 420 MB to 1.8 GB in the six minutes before the process was terminated.

A finding MUST reference the evidence it interprets.

### 1.3 Hypothesis

A hypothesis is a testable explanation for the mission question.

Example:

> The service crashed because the image-processing path retained large buffers after each request.

A hypothesis MUST record supporting, contradicting, and missing evidence.

### 1.4 Validation

A validation is an independent attempt to support, refute, reproduce, or qualify a hypothesis.

Validation outcomes are:

- `supported`;
- `partially-supported`;
- `refuted`;
- `inconclusive`;
- `not-attempted`.

## 2. Evidence requirements

Every evidence record MUST contain:

- stable evidence ID;
- schema version;
- mission ID;
- evidence type;
- source type and source identifier;
- collector tool and version;
- collection timestamp;
- observed time or time range when known;
- content or a secure content reference;
- content hash;
- sensitivity classification;
- independence group;
- integrity and redaction metadata.

Evidence SHOULD also contain:

- resource identifiers;
- MIME or data format;
- extraction method;
- byte range or line range;
- timezone information;
- source reliability notes;
- retention and deletion metadata.

## 3. Provenance

Provenance answers:

- where did this observation come from;
- who or what collected it;
- when was it collected;
- what transformation was applied;
- whether it was truncated or redacted;
- whether its integrity can be checked;
- which other records depend on it.

Derived evidence MUST reference its parent evidence and transformation. For example, a parsed error count derived from a log file must reference the original file evidence and the parser version.

## 4. Integrity

Ants SHOULD calculate a cryptographic hash over the canonical evidence payload or referenced artifact.

If source content changes after collection, the original evidence record remains immutable and a new record is created.

Evidence integrity states are:

- `verified`: hash or signature verified;
- `captured`: collected without external verification;
- `partial`: truncated, sampled, or incomplete;
- `untrusted`: authenticity is uncertain;
- `invalidated`: later evidence shows the record was corrupted or incorrectly collected.

## 5. Sensitivity

Sensitivity levels are:

- `public`;
- `internal`;
- `confidential`;
- `restricted`;
- `secret-detected`.

`secret-detected` content MUST be quarantined or redacted before model transmission or normal report generation. The audit trail may store a hash and location without storing the secret value.

## 6. Independence groups

Evidence independence is more important than agent count.

Each evidence record MUST have an `independenceGroup` representing the underlying source chain.

Examples:

- ten agents reading the same CloudWatch log stream belong to one independence group;
- a process OOM event and an independently reproduced memory-growth test may belong to different groups;
- two dashboards derived from the same metric backend may belong to the same group;
- a human incident note repeating a monitoring alert may not be independent from that alert.

Validators MUST examine independence groups before claiming multiple-source confirmation.

## 7. Source reliability

Source reliability is contextual. Ants MAY store a value from `0` to `1`, but MUST also store a rationale.

Possible considerations include:

- first-party versus copied data;
- tamper resistance;
- collection completeness;
- clock accuracy;
- parser confidence;
- known source outages;
- whether the source is user-controlled;
- whether the record was generated before or after the event.

A numerical value without a rationale is not sufficient.

## 8. Findings

A finding SHOULD contain:

- finding ID;
- mission and task IDs;
- statement;
- evidence references;
- inference method;
- confidence and rationale;
- limitations;
- agent run ID;
- creation timestamp.

Findings are append-only. A corrected finding supersedes the old finding and explains why.

## 9. Hypothesis lifecycle

A hypothesis moves through:

```text
PROPOSED
  -> INVESTIGATING
  -> VALIDATION_REQUIRED
  -> SUPPORTED | PARTIALLY_SUPPORTED | REFUTED | INCONCLUSIVE
  -> REPORTED
```

A hypothesis may return to `INVESTIGATING` if new contradictory evidence appears before mission closure.

## 10. Hypothesis fields

A hypothesis MUST contain:

- hypothesis ID;
- mission ID;
- statement;
- status;
- proposer task and agent run;
- support evidence IDs;
- contradiction evidence IDs;
- missing evidence description;
- independence groups represented;
- confidence score and rationale;
- validation records;
- created and updated timestamps.

Material hypotheses SHOULD also include:

- predicted observations;
- falsification criteria;
- affected entities;
- temporal boundaries;
- causal chain;
- alternative hypotheses;
- recommended next tasks.

## 11. Confidence model

Confidence is a bounded communication score from `0` to `1`. It is not a statistically calibrated probability unless an implementation explicitly proves calibration.

A reference model may consider:

```text
confidence = baseEvidenceStrength
           * independenceFactor
           * reproductionFactor
           * temporalRelevance
           * coverageFactor
           * contradictionPenalty
```

Implementations MAY use a different formula, but MUST expose the factors and rationale.

### Suggested interpretation

- `0.00-0.24`: weak or speculative;
- `0.25-0.49`: plausible but poorly supported;
- `0.50-0.74`: supported with material uncertainty;
- `0.75-0.89`: strongly supported;
- `0.90-1.00`: exceptionally supported and independently validated.

A score above `0.90` SHOULD require reproduction or strong independent confirmation. Confidence MUST decrease when material contradictions remain unexplained.

## 12. Pheromone score

A pheromone score prioritizes where the system investigates next. It is not the same as hypothesis confidence.

The score MAY consider:

- mission relevance;
- anomaly strength;
- evidence novelty;
- expected information gain;
- source quality;
- estimated investigation cost;
- recency;
- number of unresolved links.

A reference prioritization model is:

```text
priority = relevance
         * novelty
         * expectedInformationGain
         * sourceQuality
         * recency
         / estimatedCost
```

Pheromone scores SHOULD decay when:

- no new evidence appears;
- evidence becomes stale;
- a path is repeatedly inconclusive;
- a stronger contradiction is found;
- the mission scope changes.

Decay prevents early guesses from monopolizing the investigation.

## 13. Contradictions

Contradictions are first-class records, not negative comments hidden in prose.

A contradiction MUST identify:

- the hypothesis or finding challenged;
- the evidence or validation that challenges it;
- contradiction strength;
- whether the conflict may be explained by timing, scope, source quality, or sampling;
- resolution status.

A final report MUST include unresolved material contradictions.

## 14. Missing evidence

Absence of evidence is not evidence of absence unless the source was expected to record the event reliably and collection coverage is known.

Missing evidence records SHOULD state:

- what was sought;
- why it matters;
- where it should have existed;
- why it was unavailable;
- impact on confidence;
- whether collection can be retried.

## 15. Deduplication

Evidence MAY be deduplicated using:

- content hash;
- normalized source identity;
- observed timestamp or range;
- extraction location;
- semantic fingerprint.

Deduplication MUST preserve all provenance links. Two identical records from independent sources may be substantively important and MUST NOT be collapsed into one independence group.

## 16. Reporting rules

Reports MUST:

- cite evidence IDs for material claims;
- separate observations from inferences;
- identify validation outcomes;
- explain confidence factors;
- disclose contradictions and gaps;
- avoid exposing quarantined secrets;
- distinguish proposed from executed actions.

## 17. Example hypothesis

```json
{
  "schemaVersion": "1.0.0",
  "hypothesisId": "hyp_01JMEMORYLEAK",
  "missionId": "mis_01JLOCALNODEFAILURE",
  "statement": "The service was terminated after an image-processing path caused sustained heap growth.",
  "status": "supported",
  "supportEvidenceIds": [
    "ev_01JMEMORYSERIES",
    "ev_01JOOMEVENT",
    "ev_01JREPRODUCTION"
  ],
  "contradictionEvidenceIds": [],
  "independenceGroups": [
    "runtime-host-1",
    "staging-reproduction-1"
  ],
  "confidence": {
    "score": 0.91,
    "rationale": "Runtime evidence and an independent reproduction support the same causal chain."
  },
  "missingEvidence": [
    "A heap snapshot from the original process was not available."
  ],
  "createdAt": "2026-08-02T19:05:00Z",
  "updatedAt": "2026-08-02T19:14:00Z"
}
```
