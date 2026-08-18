# Agent Runtime data model

`agent_identities` maps a CERVEL principal to agent metadata. The principal is still the security identity.

`agent_workspace_grants` is the capability boundary. It binds one agent to one Workspace with an explicit permission set.

`agent_observations` is durable agent memory for observations that may not yet deserve graph-level Claim status. An observation can point to the Claim created from it.

`agent_subscriptions` is a durable signal cursor over one Workspace. It may bind to one Watch or filter Knowledge Event types.

`agent_delivery_receipts` records what a subscription surfaced and whether the agent acknowledged it. Unique indexes prevent replay from becoming duplicate durable delivery.

This layer references rather than replaces `principals`, `workspaces`, `claims`, `context_packages`, `knowledge_events`, `knowledge_watches`, and `watch_alerts`.
