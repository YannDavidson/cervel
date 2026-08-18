# Agent Runtime permissions

- `memory:read` — resolve the agent session and read its durable observation memory in the granted Workspace.
- `memory:write` — append observations in the granted Workspace.
- `claim:write` — materialize an observation into the CERVEL Claim graph; requires `memory:write` for the observation operation as well.
- `context:read` — request a CCP using the existing retrieval and permission pipeline.
- `events:read` — create and consume bounded Workspace signal subscriptions.
- `watch:read` — reserved capability for Watch-specific consumption and future Watch-management APIs.

Capabilities are intentionally small strings rather than role names. Higher-level roles such as research-agent, analyst, coding-agent, or executive-agent should compile down to these grants rather than being trusted directly by the runtime.
