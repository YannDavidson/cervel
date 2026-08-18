# Agent permission model

Permissions are capability-scoped and granted per Workspace. The runtime recognizes only `memory:read`, `memory:write`, `claim:write`, `context:read`, `events:read`, and `watch:read`.

Unknown permissions fail closed. `watch:read` is intentionally separate from `events:read`: an agent may consume Workspace Knowledge Events without gaining access to a principal's proactive Watch alerts.
