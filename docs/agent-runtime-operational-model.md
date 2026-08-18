# Agent Runtime operational model

Provisioning is an administrative act: create or identify a service principal, register its agent identity, then grant only the Workspaces and capabilities required for its job.

At runtime the agent supplies its CERVEL principal identity through the current alpha authentication boundary. Each endpoint resolves the grant again; possession of an agent ID is not authorization.

Disable the agent identity to stop all new agent-runtime operations. Remove or narrow a Workspace grant to revoke only that tenant scope. Historical observations, Claims, Context Packages and delivery receipts remain as audit/provenance records according to their existing retention rules.
