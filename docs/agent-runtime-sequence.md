# Agent Runtime sequence

## Task start

1. Agent authenticates as a CERVEL principal.
2. Runtime resolves the exact Node + Workspace grant and required capability.
3. Agent requests a CCP for its task.
4. Existing CERVEL retrieval assembles evidence/Claims under that principal.

## Learning

1. Agent completes reasoning or external work.
2. Agent writes an observation against a CERVEL subject.
3. When appropriate and permitted, the same call materializes a Claim.
4. Observation and Claim preserve agent + Workspace provenance.

## Proactive continuation

1. Knowledge evolves and emits a Knowledge Event.
2. Impact propagation determines downstream consequences.
3. CERVEL Watch may surface an explainable alert.
4. Agent polls its bounded subscription.
5. Runtime records delivery and advances the cursor.
6. Agent acknowledges receipt and can request a fresh CCP for the next task.
