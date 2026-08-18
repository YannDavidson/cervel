# Agent Runtime data model

`agent_identities` binds runtime identity to an existing CERVEL principal. `agent_workspace_grants` carries least-privilege capabilities. `agent_observations` records durable agent memory with optional claim linkage. `agent_subscriptions` stores event/impact/Watch filters and a bounded cursor. `agent_delivery_receipts` records surfaced signals and acknowledgements.

All runtime records preserve Node and Workspace scope where applicable so isolation is queryable and testable rather than implicit.
