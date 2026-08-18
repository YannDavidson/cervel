# Agent Runtime failure semantics

Missing or disabled agent identity / missing Workspace grant returns `AGENT_WORKSPACE_FORBIDDEN`. A present grant without the required capability returns `AGENT_PERMISSION_DENIED`. Attempting Claim creation without `claim:write` returns `AGENT_CLAIM_PERMISSION_DENIED`. Unknown or foreign subscriptions return `AGENT_SUBSCRIPTION_NOT_FOUND`.

These failures occur before the protected durable operation. Transaction boundaries ensure an observation is not partially committed if optional Claim creation fails.
