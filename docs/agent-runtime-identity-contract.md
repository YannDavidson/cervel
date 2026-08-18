# Agent identity contract

An `agent_identity` has one Node and one CERVEL principal. `kind` distinguishes internal vs external for operations/UX only. `provider` and `external_key` can help an adapter map external systems but carry zero authorization semantics.

The unique Node+principal mapping ensures one security principal has one canonical agent identity inside that Node. Capabilities on the identity describe what the agent implementation supports; permissions on Workspace grants decide what CERVEL permits.
