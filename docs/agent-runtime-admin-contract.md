# Agent administration contract

Agent registration and Workspace grants are administrative APIs authenticated as an existing CERVEL Node principal. The target agent itself is represented by a separate principal ID supplied at registration.

The runtime intentionally does not expose a self-grant endpoint. An agent may use only grants already established for its identity. Future delegation should be a separately modeled narrowing operation with audit/expiry, not permission mutation hidden inside an agent task call.
