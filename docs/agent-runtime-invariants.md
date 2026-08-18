# Agent Knowledge Runtime invariants

1. No agent runtime operation is authorized by provider name, agent name, or `kind`.
2. Every agent operation has one principal, one Node and one Workspace.
3. A Workspace grant is mandatory even when the principal belongs to the Node.
4. Write authority and read authority are separate capabilities.
5. Claim authority is stricter than observation-memory authority.
6. CCP generation executes as the agent principal and never through an administrator proxy.
7. An agent-created Claim must retain machine-readable agent + Workspace provenance.
8. Subscriptions cannot span Workspaces.
9. Watch alerts can only be consumed when they are owned by the subscribing agent principal.
10. Signal reads are bounded and delivery is durable/idempotent.
11. Revoking or disabling an agent prevents new runtime access without rewriting historical provenance.
12. Provider adapters must terminate at this contract rather than reimplementing authorization.
