# Agent Knowledge Runtime v0.1

PR #12 makes CERVEL a durable knowledge plane for internal and external AI agents.

## Runtime contract

An agent is represented by a CERVEL principal plus an `agent_identity`. Access is explicitly granted per Node + Workspace with capability permissions: `memory:read`, `memory:write`, `claim:write`, `context:read`, `events:read`, and `watch:read`.

Agents can persist observations against workspace-owned CKOs, claims, and entities. Optional claims are written into the existing CERVEL claim graph with `claimed` epistemic status, confidence, creator principal, workspace, and agent provenance. Agent writes do not become verified knowledge merely because an agent asserted them.

Agents consume existing Context Packages through the same permission-aware retrieval path used by CERVEL reasoning. The runtime does not create a parallel memory store or bypass CCP scope.

Agents can subscribe to Knowledge Events and, when explicitly granted `watch:read`, principal-owned Watch alerts. Subscriptions can filter event types, impact kinds, and confidence. Durable delivery receipts and cursors make polling bounded and replay-aware.

## Security invariants

- Agent identity must map to a principal in the same Node.
- Workspace grants fail closed and use a fixed permission vocabulary.
- Observation subjects must resolve inside the granted Workspace.
- Watch subscriptions require `watch:read` and can only bind Watches owned by the same principal in the same Node + Workspace.
- Event and Watch delivery remain Node + Workspace scoped.
- Agent-authored claims retain explicit agent provenance and start as `claimed`, not verified or authoritative.

## End-to-end loop

`Agent identity → Workspace grant → durable observation/claim → CCP → Knowledge Event → Impact → Watch → agent subscription → delivery receipt → acknowledgement`

The integration lane proves durable memory, claim provenance, CCP creation, tenant/subject isolation, and delivery of both the underlying Knowledge Event and the matching Watch alert.
