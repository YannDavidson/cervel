# Agent Workspace grant contract

A grant binds one agent identity to one Workspace in the same Node and carries a closed set of capabilities. Grant updates replace the capability set rather than silently unioning privileges.

Disabling the agent or removing the grant causes scope resolution to fail on the next runtime call. Future delegation must be modeled explicitly rather than inferred from this grant.
