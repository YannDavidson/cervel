# Implementation map

- `db/migrations/021_agent_knowledge_runtime.sql` — durable identity/grant/memory/subscription/delivery model.
- `apps/api/src/agent-runtime.ts` — authorization, observation/Claim writes, CCP consumption and signal polling.
- `apps/api/src/agent-routes.ts` — administrative + agent-facing HTTP contract.
- `apps/api/src/server.ts` — runtime registration and health capability.
- `scripts/validate-agent-runtime.ts` — real database tenant/provenance validator.
- `.github/workflows/agent-knowledge-runtime-integration.yml` — dedicated release lane.
- `docs/agent-runtime-*.md` — architecture, security, API, invariants and release contract.
