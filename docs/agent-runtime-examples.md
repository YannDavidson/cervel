# Agent Runtime examples

A research agent can receive `context:read` + `events:read` to build CCPs and react to source changes without writing memory. A project agent can additionally receive `memory:write` + `claim:write` to persist observations and explicit assertions. A proactive executive agent can receive `watch:read` to consume only Watches owned by its principal inside the granted Workspace.

Least privilege is the intended default: capabilities are composed per agent and per Workspace rather than inherited Node-wide.
