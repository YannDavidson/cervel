# Agent Runtime v0.1 non-goals

PR #12 does not choose an LLM provider, execute arbitrary tools, schedule autonomous jobs, manage multi-agent task graphs, expose a public unauthenticated agent endpoint, or replace CERVEL's existing retrieval/reasoning stack.

It also does not introduce provider-specific memory formats. Agent memory is represented using CERVEL observations, Claims, CCPs, Knowledge Events and Watch alerts so the same knowledge remains portable across models and orchestrators.

Push transports and protocol adapters are deliberately deferred. The first invariant to stabilize is that every agent interaction with durable knowledge is permission-scoped and provenance-preserving.
