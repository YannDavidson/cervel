# Agent Runtime design principles

1. Agents are principals, not privileged exceptions.
2. Memory is durable and attributable.
3. Agent assertions are epistemic claims, not automatic truth.
4. Context is assembled through CCP, not copied into a shadow store.
5. Permissions are Workspace-scoped and fail closed.
6. Watch is a separate capability from raw event access.
7. Delivery is replay-aware and auditable.
8. Provider neutrality is preserved at the CERVEL boundary.
