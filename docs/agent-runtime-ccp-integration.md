# Agent + CCP integration

Agent context is not a new retrieval implementation. `context:read` authorizes the agent to call the existing Context Package assembler with its own principal identity and exact Workspace scope.

That means agent context inherits CERVEL retrieval permissions, evidence packaging, provenance, semantic enrichment compatibility, and downstream traceability instead of maintaining a separate agent-memory retrieval path.
