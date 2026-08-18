# Future protocol adapters

The core runtime is intentionally transport-neutral. A future MCP server can map CERVEL operations to resources/tools; an A2A gateway can map task and event exchange to agent subscriptions; coding-agent plugins can use CCP and observation APIs directly; internal CERVEL agents can call the runtime in-process.

All adapters must preserve three values from the core request: CERVEL principal, Node, and Workspace. An adapter may narrow permissions but must never widen them. Provider credentials prove who the external caller is; the CERVEL grant decides what that caller may know or change.
