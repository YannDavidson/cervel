# Agent Runtime API v0.1

Administrative setup uses a normal authenticated CERVEL principal:

- `POST /v1/agents` — register an internal/external agent identity around an existing CERVEL principal.
- `POST /v1/agents/:id/grants` — grant explicit permissions in one Node + Workspace.

Agent-facing runtime:

- `GET /v1/agent/session` — resolve the current agent and effective Workspace grant.
- `POST /v1/agent/observations` — write durable memory; optionally materialize a Claim.
- `GET /v1/agent/observations` — read the agent's Workspace-scoped observation memory.
- `POST /v1/agent/context` — assemble a permission-aware CCP for the agent.
- `POST /v1/agent/subscriptions` — subscribe to Knowledge Events and/or a Watch.
- `GET /v1/agent/subscriptions/:id/signals` — pull bounded new signals and advance the cursor.
- `POST /v1/agent/deliveries/:id/ack` — acknowledge a durable delivery receipt.

Every agent-facing request authenticates through `X-CERVEL-PRINCIPAL-ID` in v0.1. Provider-specific credentials must terminate into a CERVEL principal before entering this runtime; they do not bypass the CERVEL permission model.
