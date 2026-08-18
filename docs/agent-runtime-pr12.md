# PR #12 — Agent Knowledge Runtime

This change turns CERVEL from a knowledge system that AI can query into a knowledge runtime that AI agents can inhabit safely.

An internal or external agent gets a first-class CERVEL identity, explicit Workspace capabilities, durable observation memory, provenance-aware Claim writes, permission-aware CCP consumption, and subscriptions to Knowledge Events / CERVEL Watch alerts.

The design intentionally reuses CERVEL's existing primitives rather than creating an agent-only silo: principals remain the authentication boundary; Workspaces remain the tenant boundary; Claims remain the durable semantic assertion; CCP remains the context contract; Knowledge Events remain the change stream; CERVEL Watch remains the relevance/importance layer.

The result is a closed knowledge loop:

`Agent task → CCP → reasoning/action → observation/Claim → evolving knowledge → Event → Impact → Watch → agent signal → next task`

PR #12 does not yet make CERVEL an agent orchestrator. It makes CERVEL the durable, permission-aware knowledge substrate beneath orchestrators, coding agents, business agents, research agents, assistants, and future multi-agent systems.
