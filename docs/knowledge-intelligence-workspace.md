# CERVEL Knowledge Intelligence Workspace

PR #13 turns the accumulated CERVEL runtimes into one human-facing knowledge command center.

## Product surfaces

- **Knowledge Graph** — semantic entities and relationships already produced by CERVEL reasoning.
- **Timeline** — Knowledge Events ordered as the living history of a Workspace.
- **Sources** — provider connections, watched-source freshness, and sync health.
- **Changes** — semantic diffs and version transitions from Knowledge Evolution.
- **Claims** — current and historical epistemic assertions with confidence and temporal status.
- **Decisions** — decision-typed CKOs plus `DECISION_CHANGED` events; v0.1 deliberately avoids a duplicate decision database.
- **Contradictions** — first-class claim conflicts and their confidence.
- **Health** — an operational knowledge-health score composed from open health notifications, unhealthy sources, and contradictions.
- **Agents** — CERVEL agent identities, Workspace grants, observations, and subscriptions.
- **Ask CERVEL** — the existing CCP → semantic/temporal reasoning → cited answer → Trace path.

## Architecture

The UI consumes a permission-aware Workspace intelligence read-model. It does not reimplement Graph, Evolution, Impact, Watch, Source, Agent, or Reasoning runtimes. The product layer therefore stays replaceable while the underlying knowledge contracts remain canonical.

`Sources → CKOs/Artifacts → Claims/Entities → Evolution → Events → Impact → Watch/Agents → Intelligence Read Model → Human Workspace → Ask/Trace`

## Scope and safety

Every intelligence query is bound to the resolved CERVEL session's Node and optional Workspace. The integration gate seeds two Workspaces and proves Timeline, Changes, Claims, Decisions, Contradictions, Sources, Health, and Agents do not leak across the Workspace boundary.

The previous Workspace Alpha remains available at `/workspace/alpha`; `/workspace` becomes the Knowledge Intelligence Workspace.
