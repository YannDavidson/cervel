# Agent Runtime metrics for later observability

Useful counters after v0.1 include active agents by Node/Workspace, grant denials, observations written, Claims promoted from observations, CCPs assembled by agents, signal backlog depth, delivery latency, duplicate-delivery prevention, acknowledgements, Watch-to-agent wakeups, and agent-generated Claims later contradicted or superseded.

These metrics should be derived from scoped runtime/audit records rather than logging raw private knowledge content. No telemetry implementation is added in PR #12.
