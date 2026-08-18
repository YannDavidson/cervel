# Why Agent Knowledge Runtime matters

Most agent systems keep memory inside the orchestrator that created the agent. That couples knowledge to one model, one framework, one application and often one conversation.

CERVEL takes the opposite position: the knowledge substrate should outlive the agent. Agents are temporary readers/writers operating under explicit authority. Their observations can become shared durable knowledge, their task context can be reproduced as a CCP, and changes to upstream knowledge can proactively return to the right agent through Events and Watch signals.

That makes CERVEL useful not only as RAG storage, but as a governed memory and context layer shared across heterogeneous agents.
