# CERVEL Knowledge Compiler

The Knowledge Compiler turns a conversation into durable, inspectable knowledge without treating a chat transcript as the knowledge itself.

## Separation of concerns

- **Session:** immutable ordered user, assistant, and system turns, with optional Answer and source CKO references.
- **Answer:** remains the cited response produced by CERVEL reasoning.
- **Knowledge:** classified candidates become CKOs and claims only after the selected compilation policy permits it.
- **Artifact:** source files remain independently stored, hashed, versioned, and provenance-addressable.

## Compilation lifecycle

`POST /v1/knowledge/sessions` creates a session in `automatic`, `review`, or `session_only` mode. Turns are appended at `/turns`; `/compile` produces a deterministic receipt containing the input digest, classification, filing proposals, candidate totals, duplicate totals, and contradiction totals.

- `automatic` materializes eligible candidates immediately.
- `review` keeps candidates proposed until `/v1/knowledge/compilations/:id/review` accepts them.
- `session_only` preserves the session and receipt without creating knowledge.

Each extracted claim, decision, task, insight, or unresolved question has a stable fingerprint and semantic key. Exact matches reuse existing knowledge. Opposite-polarity semantic matches are both retained, marked contradicted, joined through `claim_conflicts`, and published as `CLAIM_CONTRADICTED` knowledge events. New materialized statements publish `CLAIM_INTRODUCED` events. CERVEL does not silently overwrite contested knowledge.

## Provenance and receipts

Every candidate records its source turn ordinals; every turn records a content SHA-256 plus optional source CKO and Answer identifiers. Materialized CKOs use the standard CERVEL creation provenance path, while compiler events carry the originating session and compilation run. Repeating the same session digest and mode returns the existing receipt, making retries safe.

Filing suggestions are proposals, not mutations. Their paths are portable strings and the compiled CKOs, claims, events, receipts, and raw session rows remain exportable database records with no provider-specific format.
