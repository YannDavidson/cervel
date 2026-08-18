# Agent revocation

There are two revocation levels in v0.1. Set `agent_identities.enabled=false` to stop all new Agent Runtime operations for that principal. Remove or change an `agent_workspace_grants` row to revoke or narrow one Workspace only.

Runtime authorization resolves identity and grant on each operation, so revocation does not depend on a long-lived cached agent session in the core. Historical observations, Claims and receipts remain intact for provenance/audit unless separate retention policy removes them.
