# CERVEL Knowledge Impact & Dependency Engine

PR #10 makes downstream dependence explicit and propagates Knowledge Events through that dependency graph.

## Dependency relations

- `depends_on`: source cannot be evaluated correctly without target.
- `derived_from`: source was generated or calculated from target.
- `supports`: source provides support for target.
- `contradicts`: source conflicts with target and usually requires review.
- `supersedes`: source replaces an older target state.
- `affected_by`: explicit impact-sensitive link for domain/application use.

Edges are Workspace-scoped, temporal, confidence/strength weighted, and can be excluded from propagation without deleting history.

## Direction

Dependencies point **from dependent to prerequisite**. Impact propagation starts at a changed resource and follows incoming edges toward resources that depend on it.

Example:

`Answer --depends_on--> Claim --derived_from--> CKO`

If the CKO changes, impact flows `CKO -> Claim -> Answer`.

## Impact propagation

Each Knowledge Event creates a bounded propagation run. Confidence decays by relation type and edge strength. Traversal stops at maximum depth, confidence floor, or an already-seen stronger path. Every impact persists its path and depth for auditability.

Historical answers and CCPs are not rewritten. They are marked `affected`, `stale`, `invalidated`, or `requires_review` through `knowledge_event_impacts` while retaining their original Trace.

## Automatic inference

CERVEL derives dependency edges from current claims, CCP claim membership, answer-to-CCP/claim lineage, conflicts, and claim evolution. Explicit application/domain dependencies can also be created through `/v1/dependencies`.
