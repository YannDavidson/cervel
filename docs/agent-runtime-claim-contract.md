# Agent Claim contract

When `POST /v1/agent/observations` includes a Claim request, the runtime first requires the normal observation write grant and then separately verifies `claim:write`. The Claim is inserted into the existing CERVEL `claims` table, not an agent-specific shadow table.

The v0.1 route materializes literal Claims and stores `{workspace_id, agent_id, source: "agent_runtime"}` in qualifiers. The observation stores `created_claim_id`, giving a direct audit edge from machine memory to semantic assertion.
