# Agent Runtime success criteria

PR #12 succeeds when CERVEL can truthfully say: “Any authorized AI agent can use me as durable memory and context without owning the knowledge store.”

Concretely, the same agent must be able to return after a model/session restart, recover task context through CCP, read its durable observations, add new observations/Claims when permitted, and discover relevant knowledge changes through Event/Watch signals — while being unable to cross into an ungranted Workspace.
