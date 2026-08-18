# Agent Runtime roadmap after v0.1

The v0.1 runtime deliberately establishes identity, permissions, durable memory, CCP consumption, and signals before transport-specific integrations.

Recommended follow-ons:

1. **Agent Auth + Delegation** — signed short-lived agent sessions, credential rotation, delegated grants, approval boundaries, quotas and audit policy.
2. **MCP / A2A Gateway** — expose CERVEL memory, CCP, Claims, CKURI resolution, Watch subscriptions and traces through standardized agent protocols without changing the core permission model.
3. **Push Signal Delivery** — webhooks, SSE/WebSocket, queues and agent-to-agent delivery backed by the existing subscription/receipt model.
4. **Agent Memory Policies** — retention, consolidation, confidence decay, contradiction handling, promotion from observation to Claim, and human review queues.
5. **Agent Teams** — scoped shared memory, task context packages, handoffs, provenance-aware collaboration and bounded delegation between agents.
