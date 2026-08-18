# Agent Knowledge Runtime product contract

For a builder integrating an AI agent, CERVEL should provide four dependable verbs:

**Remember** — persist an observation, with optional promotion into shared Claim knowledge.

**Contextualize** — assemble a permission-aware CCP for the agent's current task.

**Listen** — subscribe to relevant knowledge change through Events and Watch.

**Audit** — preserve who wrote knowledge, what context was used, what signal was delivered, and which Workspace authorized the operation.

Everything provider-specific should be an adapter around these verbs rather than a fork of CERVEL's knowledge model.
