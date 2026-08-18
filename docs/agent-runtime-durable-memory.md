# Durable agent memory

The memory guarantee in PR #12 is intentionally independent of an LLM conversation. An observation is a CERVEL database record keyed to agent, Node, Workspace and subject. A later session using the same CERVEL principal and grant can recover that memory even if the underlying model, context window or provider has changed.

Shared semantic knowledge is a separate promotion step through Claims. This lets CERVEL distinguish “the agent remembered this” from “CERVEL currently asserts this as knowledge.”
