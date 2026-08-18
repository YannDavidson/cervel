# PR #16 — CKEP Reactive Intelligence

PR #16 makes the CKEP journal the standardized reaction source for CERVEL intelligence.

## Convergence chain

`Evolution → Knowledge Event → CKEP publish → immutable journal → reactive dispatch → Knowledge Event projection → Impact → Watch → Agent CKEP delivery`

The existing `knowledge_events` table remains a compatibility/read-model projection for mature Impact and Watch code. It is no longer the portable event contract. CKEP journal identity and sequence are authoritative for standardized reaction.

## Reactive dispatch

`ckep_reactive_dispatches` maps one immutable journal event to one scoped Knowledge Event projection and records dispatch status, impact propagation run, impact count, Watch match count, and errors. Re-dispatch of a succeeded event is idempotent.

The dispatcher fails closed when the journal event does not belong to the requested Node + Workspace or when its subject cannot be resolved as a CERVEL UUID-backed resource.

## Evolution

The Evolution API publishes every generated Knowledge Event through the PR #15 publish bridge, then dispatches the resulting journal entry. This gives Evolution a standardized CKEP boundary while preserving existing temporal/evidence semantics.

## Impact + Watch

The dispatcher invokes dependency inference, bounded impact propagation, and Watch evaluation from the CKEP-backed projection. This keeps the proven PR #10/#11 engines while changing the source of reaction to the CKEP stream.

## Agents

Agent subscriptions gain a CKEP sequence cursor. `/v1/agent/subscriptions/:id/ckep-signals` returns only successfully dispatched journal entries inside the agent's granted Workspace and applies the subscription's event type, impact kind, and confidence filters. Deliveries receive durable receipts linked to the CKEP journal event.

## Isolation

All journal reads, projections, dispatches, impacts, Watches, and agent signal queries include exact Node + Workspace predicates. A journal event cannot be dispatched through another Workspace.
