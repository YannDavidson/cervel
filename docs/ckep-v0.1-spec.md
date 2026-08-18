# CKEP v0.1 — CERVEL Knowledge Event Protocol

CKEP is CERVEL's portable, immutable contract for describing **how knowledge changed**. It sits beside CKO (object), CKURI (address), and CCP (context package).

## Canonical envelope

```yaml
ckep: "0.1"
event:
  id: "cke://acme/workspaces/product/events/019..."
  type: "CLAIM_SUPERSEDED"
scope:
  node: "ck://acme/nodes/019..."
  workspace: "ck://acme/workspaces/product"
subject:
  uri: "ck://acme/claims/019..."
  type: "claim"
transition:
  previous:
    uri: "ck://acme/claims/018..."
  current:
    uri: "ck://acme/claims/019..."
temporal:
  observed_at: "2026-08-18T20:40:31Z"
  effective_at: "2026-10-15T00:00:00Z"
epistemics:
  confidence: 0.94
impact:
  - uri: "ck://acme/decision/pricing"
    relationship: "requires_review"
    severity: "high"
    confidence: 0.88
provenance:
  method: "semantic_diff"
  derived_from:
    - "ck://acme/cko/019..."
causality:
  caused_by:
    - "cke://acme/workspaces/product/events/018..."
  root_event: "cke://acme/workspaces/product/events/018..."
integrity:
  sequence: 18429
  previous_event: "cke://acme/workspaces/product/events/018..."
  idempotency_key: "<sha256>"
  hash: "<sha256>"
```

## Event identity

The canonical CKEP identity is:

`cke://<node-authority>/workspaces/<workspace-id>/events/<event-id>`

The Workspace is part of event identity. A CKEP event cannot be re-homed into another Workspace without becoming a different event and therefore a different integrity hash.

## Taxonomy

Object/artifact: `OBJECT_CREATED`, `OBJECT_UPDATED`, `OBJECT_DELETED`, `ARTIFACT_VERSIONED`.

Claims: `CLAIM_INTRODUCED`, `CLAIM_CONFIRMED`, `CLAIM_ASSERTED`, `CLAIM_MODIFIED`, `CLAIM_CONTRADICTED`, `CLAIM_CHALLENGED`, `CLAIM_SUPERSEDED`, `CLAIM_WITHDRAWN`, `CLAIM_RETRACTED`.

Graph/conflict: `CONTRADICTION_DETECTED`, `CONTRADICTION_RESOLVED`, `RELATIONSHIP_CREATED`, `RELATIONSHIP_REMOVED`.

Decisions/entities: `DECISION_CREATED`, `DECISION_CHANGED`, `DEADLINE_CHANGED`, `ENTITY_ADDED`.

Sources/health: `SOURCE_CONNECTED`, `SOURCE_CHANGED`, `SOURCE_DELETED`, `SOURCE_STALE`, `SOURCE_RECOVERED`, `KNOWLEDGE_BECAME_STALE`, `KNOWLEDGE_HEALTH_DEGRADED`, `KNOWLEDGE_HEALTH_RECOVERED`.

Risk: `RISK_DETECTED`.

Event type states **what happened**. `provenance.method` explains **why CERVEL believes it happened**. `impact` records **what may be affected**. These dimensions must remain separate.

## Temporal semantics

`observed_at` is when CERVEL learned about the event. `effective_at` is when the represented knowledge is believed to become effective. They may differ in either direction and must never be collapsed into one timestamp.

## Subject and transition

`subject` names the resource whose knowledge state changed. `transition.previous` and `transition.current` identify or embed before/after states. CKEP never requires destruction of the previous state; historical identity remains addressable.

## Evidence and provenance

Evidence identifies sources, artifact versions, and fragments supporting the event. Provenance records the method, actor where known, and `derived_from` chain. Provider-native identifiers belong in provenance metadata; they do not replace CERVEL identity.

## Impact

Impact entries identify downstream CERVEL resources plus relationship, severity, and confidence. CKEP does not perform dependency propagation itself; PR #10's Impact Engine is one producer of these records.

## Causality

`caused_by` records immediate parent events. `root_event` identifies the causal root. `correlation_id` may group a workflow or transaction. Causal graphs may branch; consumers must not assume a single parent.

## Ordering

`integrity.sequence` is a monotonically increasing sequence **within an event stream chosen by the publisher**. Sequence values are ordering hints, not global wall-clock truth. For sequence > 1, `previous_event` is required in v0.1 to make continuity explicit.

## Idempotency

`idempotency_key` is a deterministic SHA-256 over scope + event type + subject + observation time + transition. Producers should return the existing event when the same key is received twice within the same stream rather than appending a semantic duplicate.

## Integrity

`integrity.hash` is SHA-256 over canonical JSON for the full event envelope excluding the hash field itself. The v0.1 validator sorts object keys recursively before hashing. Mutation after publication causes validation failure.

## Workspace isolation

CKEP does not expand permissions. The publisher must prove the event subject/evidence belongs to the declared Node + Workspace before serialization. Legacy mapping fails closed if a `knowledge_events` row's Node or Workspace differs from the requested envelope scope.

## Compatibility with current CERVEL events

The existing `knowledge_events` + `knowledge_event_impacts` tables remain runtime storage in v0.1. `mapScopedKnowledgeEventToCkep()` translates supported rows into CKEP without rewriting those tables. Existing event types map directly; unmapped future/legacy event types fail closed rather than silently degrading.

Current fields map as follows:

- `knowledge_events.id` → `event.id`
- `event_type` → `event.type`
- `node_id/workspace_id` → `scope`
- `subject_type/subject_id` → `subject`
- `previous_claim_id/current_claim_id` → `transition`
- `observed_at/effective_at` → `temporal`
- `confidence` → `epistemics.confidence`
- `cko_id/knowledge_diff_id` → `provenance.derived_from`
- `knowledge_event_impacts` → `impact`
- legacy summary/details → provenance metadata

## Extensibility

Protocol additions that are not part of the v0.1 core envelope belong under `extensions`. Core field meaning must not be redefined by extensions. Breaking semantic changes require a new CKEP version.
