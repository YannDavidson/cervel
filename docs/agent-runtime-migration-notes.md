# Migration 021 notes

Migration 021 is additive. It creates agent identity, Workspace grant, observation, subscription and delivery-receipt tables referencing existing CERVEL principals, nodes, workspaces, Claims, Knowledge Events, Watches and Watch alerts.

No existing table is rewritten and no existing data is migrated. This keeps rollback/compatibility risk low: older runtimes can ignore the new tables, while PR #12 runtime requires migration 021 before its endpoints are used.
