# Agent trust boundary

CERVEL treats model output as data until an explicitly permitted operation turns it into durable state. An agent can reason about anything its CCP contains, but it can only persist an observation with `memory:write`, and it can only assert into the Claim graph with `claim:write`.

This distinction is important for autonomous systems: retrieval permission does not imply mutation permission, and mutation permission does not imply authority over other Workspaces. Future high-impact actions should build on the same pattern with additional capabilities and approval policy rather than granting a generic agent-admin role.
