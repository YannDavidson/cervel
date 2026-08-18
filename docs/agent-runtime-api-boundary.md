# Agent API boundary

The `/v1/agent/*` surface is the provider-neutral runtime contract. `/v1/agents*` is administrative provisioning.

Agent-facing routes never accept an `agent_id` as proof of identity. They derive the agent identity from `X-CERVEL-PRINCIPAL-ID`, Node and Workspace through `loadAgentScope`. Subscription IDs and delivery IDs are treated as resource selectors only and are rejoined to the authenticated agent before use.

This prevents UUID possession from becoming authorization.
