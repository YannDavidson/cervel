# Agent Runtime invariants

- Agent principal and identity share one Node.
- Every runtime Workspace access requires an explicit grant.
- Permission names come from a closed vocabulary.
- Durable writes cannot target resources outside the granted Workspace.
- Agent claims retain creator and agent/workspace provenance.
- Default agent claim status is `claimed`.
- Watch alerts require separate Watch permission and same-principal ownership.
- Signal queries always include Node + Workspace.
- Polling is bounded; receipts are durable; acknowledgement is idempotent.
