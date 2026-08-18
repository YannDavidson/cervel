# Agent Knowledge Runtime v0.1 — Definition of Done

The runtime is releasable when an agent can be provisioned as a CERVEL principal, granted one Workspace, write a durable observation and Claim with provenance, consume a CCP through the existing permission-aware pipeline, subscribe to the Workspace's Knowledge Events / its own Watch alerts, receive bounded idempotent signals, and acknowledge delivery.

The release must also prove a principal cannot use Node membership to read a second Workspace without a grant. No provider-specific integration is required for v0.1; OpenAI, Anthropic, Gemini, local models, coding agents, and internal CERVEL agents should all terminate into the same runtime contract.
