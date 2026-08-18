# Agent Runtime audit trail

The v0.1 audit chain is designed to answer four questions: **which agent knew what, under which Workspace authority, what did it write, and what change caused it to act again?**

Identity and grants establish authority. `agent_observations` establish durable machine memory. Optional Claims establish graph-level assertions with agent/Workspace qualifiers. Context Packages establish what evidence CERVEL supplied to the agent. Knowledge Events and Watch alerts establish why knowledge changed or became relevant. Delivery receipts establish which signal was surfaced and when it was acknowledged.

Later model/tool execution traces can attach to these identifiers without changing the underlying knowledge contract.
