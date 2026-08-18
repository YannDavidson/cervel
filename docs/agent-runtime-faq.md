# Agent Runtime FAQ

**Does CERVEL run the model?** No. PR #12 supplies durable knowledge/context/memory/signals beneath model runtimes.

**Can an internal agent bypass grants?** No. Internal/external is metadata, not authority.

**Does every observation become a Claim?** No. Claim promotion is optional and separately permissioned.

**Can an agent read another Workspace in the same Node?** Not without an explicit grant.

**Can it receive Watch alerts?** Yes, but only alerts owned by its principal in the granted Workspace.

**Is MCP/A2A included?** Not yet. PR #12 establishes the core contract those adapters should expose later.
