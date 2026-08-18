# PR #12 release summary

Adds the Agent Knowledge Runtime above CERVEL's existing knowledge, CCP, evolution, impact and Watch layers. Internal/external AI agents are represented as CERVEL principals, receive explicit Workspace capability grants, can persist observation memory and provenance-aware Claims, request normal permission-aware CCPs, and subscribe to Workspace Knowledge Events / their own Watch alerts through bounded durable cursors and delivery receipts.

The implementation is provider-neutral and intentionally does not add autonomous tool execution, provider credentials, MCP/A2A transport, or a background agent daemon.
