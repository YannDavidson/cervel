# Agent claim contract

An agent may create a structured literal claim only when its Workspace grant contains `claim:write`. The claim uses the existing CERVEL claim table, records the agent principal as `created_by`, stores `workspace_id`, `agent_id`, and `source=agent_runtime` qualifiers, carries bounded confidence, and defaults to `claimed` epistemic status.

Verification and authority remain separate epistemic transitions.
