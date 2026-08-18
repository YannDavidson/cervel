# PR #12 review guide

Review the code in this order: migration 021 for durable boundaries; `agent-runtime.ts` for authorization and persistence; `agent-routes.ts` for exposed surface; `server.ts` for registration; validator/workflow for release proof.

The most important review question is not whether an agent can write/read successfully, but whether every successful path requires the exact Node + Workspace grant and whether every durable write/signal remains attributable to the agent principal.

Do not approve a convenience bypass for internal agents. Internal and external agents intentionally share the same core authorization contract.
