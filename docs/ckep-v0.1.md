# CKEP — CERVEL Knowledge Event Protocol v0.1

CKEP is the event contract for describing how owned knowledge changes over time.

A CKEP event is immutable. It does not overwrite the prior claim or artifact; it links the previous state, current state, semantic diff, effective/observed time, confidence, impact, and provenance.

```json
{
  "id": "cke://workspace/<workspace>/events/<uuid>",
  "type": "CLAIM_SUPERSEDED",
  "subject": "ck://<authority>/cko/<uuid>",
  "previous_claim_id": "<uuid>",
  "current_claim_id": "<uuid>",
  "knowledge_diff_id": "<uuid>",
  "observed_at": "2026-08-17T00:00:00Z",
  "effective_at": null,
  "confidence": 0.94,
  "impact": [],
  "trace": {
    "current_claim": true,
    "previous_claim": true,
    "semantic_diff": true,
    "fragment": true,
    "artifact_version": true,
    "source": true
  }
}
```

## Event types

`CLAIM_INTRODUCED`, `CLAIM_CONFIRMED`, `CLAIM_MODIFIED`, `CLAIM_CONTRADICTED`, `CLAIM_SUPERSEDED`, `CLAIM_WITHDRAWN`, `SOURCE_CHANGED`, `SOURCE_DELETED`, `DECISION_CHANGED`, `DEADLINE_CHANGED`, `ENTITY_ADDED`, `RISK_DETECTED`.

## Temporal rule

`observed_at` answers when CERVEL learned about the change. `effective_at` answers when the change is believed to become true. Claim `valid_from`/`valid_until` preserve historical truth windows.

## Identity rule

CKEP events reference CERVEL identities. Provider IDs may appear in provenance metadata but never replace CKO/claim/event identity.

## Authorization rule

Event queries inherit the Node/Workspace permission boundary of the underlying knowledge. Evolution history must never expand access to historical content a principal could not otherwise access.
