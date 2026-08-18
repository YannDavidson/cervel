# Agent API boundary

Administrative routes register identities and grants. Runtime routes operate as the agent principal and therefore cannot choose another principal at request time. Node and Workspace identifiers are always checked against the resolved agent grant.

This keeps provisioning authority separate from runtime capability use even though v0.1 still uses the shared CERVEL principal-header authentication mechanism.
