# Acceptance criteria

- Agent identity is bound to a real CERVEL principal.
- Exact Workspace grant is required for every agent-facing operation.
- Observation memory survives independently of a model session.
- Claim promotion is separately permissioned and provenance-preserving.
- Agent context is a normal CCP assembled under the agent principal.
- Signal subscriptions reuse Knowledge Events / Watch rather than inventing a parallel relevance engine.
- Watch alerts remain principal-private.
- Signal reads are bounded, cursor-based and receipt-backed.
- Cross-Workspace access is proven denied in real Postgres validation.
- All legacy CERVEL integration lanes remain green on the final head.
