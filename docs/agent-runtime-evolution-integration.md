# Agent Runtime + Knowledge Evolution

Agent-created Claims are normal CERVEL Claims. They are intentionally not placed in a separate agent graph. This allows later source deltas, contradiction detection, temporal reasoning and Knowledge Evolution to operate on machine-created assertions using the same semantics as other knowledge.

The Claim qualifiers added by PR #12 preserve `workspace_id`, `agent_id`, and `source=agent_runtime`, allowing future evolution policy to treat agent-originated knowledge differently when needed without losing interoperability.
