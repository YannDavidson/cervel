# Agent Runtime design principles

**Knowledge survives agents.** Durable memory belongs to CERVEL, not a model session.

**Agents have identity, not omniscience.** Being an AI agent grants no ambient read/write authority.

**Context is a governed artifact.** CCP is the handoff boundary from CERVEL knowledge into agent reasoning.

**Observation precedes assertion.** Agents can store observations without forcing every machine statement into the Claim graph.

**Provenance is mandatory.** When an observation becomes a Claim, agent and Workspace origin remain machine-readable.

**Proactivity reuses knowledge change.** Agent notifications consume the same Events, impact paths and Watch relevance layer already used for humans.

**Providers are adapters.** OpenAI, Anthropic, Gemini, local models and future protocols terminate into one CERVEL contract.
