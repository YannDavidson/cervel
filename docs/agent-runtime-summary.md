# CERVEL Agent Knowledge Runtime v0.1

**Purpose:** give AI agents durable memory without giving them ambient authority.

**Identity:** every agent is a CERVEL principal plus agent metadata.

**Boundary:** every operation is exact Node + Workspace + capability scoped.

**Memory:** observations are durable; important observations can become provenance-aware Claims.

**Context:** agents consume normal CERVEL Context Packages under their own principal.

**Proactivity:** agents subscribe to Knowledge Events and CERVEL Watch alerts through bounded durable cursors and delivery receipts.

**Portability:** no model provider or agent framework owns the memory representation.

**Core loop:** `CCP → Agent → Observation/Claim → Knowledge Evolution → Event → Impact → Watch → Agent Signal → CCP`.
