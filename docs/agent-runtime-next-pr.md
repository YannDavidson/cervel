# Suggested next milestone after PR #12

Once the core runtime is merged, the highest-leverage follow-up is **Agent Auth + Protocol Gateway**: issue short-lived scoped credentials for agent principals, then expose the stable Agent Knowledge Runtime through MCP and/or A2A adapters.

That PR should not change the durable memory model. Its job is to make the PR #12 contract safely reachable from external agent ecosystems while preserving principal + Node + Workspace + capability on every call.
