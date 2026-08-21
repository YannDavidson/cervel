# CERVEL Deliverables Engine

The Deliverables Engine turns approved CERVEL knowledge into consistent, recoverable documents and presentations. A deliverable is a projection of canonical content—not a detached copy that becomes a second source of truth.

## Model

- **Semantic templates** define required sections and the canonical block kinds allowed in each section.
- **Canonical content blocks** are reusable, versioned units backed by CKO and claim identifiers.
- **Deliverable Objects** bind an ordered block set to a template, format, brand profile, dependencies, approval state, and version.
- **Brand profiles** contain colors, typography, controlled terminology, prohibited terms, and footer rules.
- **Render receipts** record format, version, SHA-256, MIME type, and the artifact produced.

The normative JSON contract is `packages/contracts/v0.1/deliverable.schema.json`.

## Rendering and consistency

The deterministic renderer supports Markdown, HTML, PDF, DOCX, and PPTX presentations. Terminology is normalized during rendering while canonical blocks remain unchanged. Consistency checks reject missing required sections, conflicting block versions, and prohibited terminology, and warn when unapproved blocks are used.

## Versioning, propagation, and recovery

Dependencies point to the exact CKO, claim, artifact, canonical block, template, brand profile, or deliverable used. When a dependency changes, dependents move from `current` to `stale` or `queued`; updates produce a new deliverable version and never overwrite an approved version. Approval records identify the principal and decision independently of the mutable working state.

Before propagation or replacement, the engine stores a recovery snapshot containing the full manifest and render inventory. Exports bundle the Deliverable Object JSON, canonical blocks, dependency manifest, approval history, render receipts, and selected rendered files. This makes recovery possible without a proprietary editor or cloud service.
