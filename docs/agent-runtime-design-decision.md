# Design decision: CERVEL principal is the agent security identity

PR #12 deliberately does not create a parallel authentication universe for agents. `agent_identities` enriches an existing principal; it does not replace it.

This keeps permissions, CCP retrieval, provenance and future audit policy on one identity plane. It also means an external provider can change without migrating durable knowledge: only the adapter/credential mapping to the CERVEL principal changes.

A later short-lived agent-token system should therefore issue authority *for* a CERVEL principal and constrained Workspace grants, not invent a provider-specific authorization model.
