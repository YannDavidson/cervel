# Provider neutrality

`provider` and `external_key` on `agent_identities` are metadata for adapters and operations. Neither participates in authorization.

This is intentional: a CERVEL agent can move from one hosted model to another, from hosted to local, or from a custom orchestrator to MCP/A2A without migrating its durable CERVEL identity, Workspace grants, observations, Claims, Context Packages, subscriptions or delivery history.

The knowledge layer remains stable while inference infrastructure changes.
