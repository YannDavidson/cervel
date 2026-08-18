# External agents

An external agent is not a remote database client. It should authenticate through an adapter, resolve to a dedicated CERVEL service principal, then use the Agent Runtime API within granted Workspaces.

Do not map multiple unrelated customer agents to one shared principal. Principal separation plus Workspace grants is what makes revocation, audit, Watch ownership and provenance meaningful.
