# PR #12 implementation summary

PR #12 introduces the control plane required for AI agents to become governed participants in CERVEL: first-class identity, explicit Workspace capabilities, durable observation memory, provenance-aware semantic writes, CCP context consumption, and proactive signal delivery.

It deliberately leaves model execution and transport outside the knowledge core. That preserves a clean architectural boundary: **agents think and act; CERVEL remembers, contextualizes, governs and tells them when knowledge changes.**
