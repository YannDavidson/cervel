# Integration boundary

External integrations should end at a small adapter: authenticate provider/framework caller → map to CERVEL principal → choose Node/Workspace requested by the application → invoke `/v1/agent/*`.

The adapter must not query CERVEL storage directly, synthesize its own Workspace permissions, or rewrite CCP/Watch semantics. This keeps external agent ecosystems replaceable and the CERVEL knowledge contract authoritative.
