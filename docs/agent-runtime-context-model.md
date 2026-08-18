# Agent context model

Agents consume CERVEL through Context Packages rather than direct unrestricted database reads. This makes the context handed to an agent a durable, inspectable product of retrieval scope, evidence ranking, Claims and provenance.

`POST /v1/agent/context` first verifies the agent's exact Workspace `context:read` grant, then invokes the same `assembleContextPackage` path used elsewhere. The agent principal is passed through unchanged, so existing retrieval permissions remain authoritative.

Future model adapters should treat the returned CCP as the canonical task context and retain its ID in model/tool execution traces.
