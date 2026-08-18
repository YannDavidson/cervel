# Agent signal model

Agent subscriptions are not a second event system. They are a delivery/cursor layer over CERVEL's existing Knowledge Events and Watch alerts.

Raw Knowledge Events are useful for agents that need broad change awareness. Watch-bound signals are useful when CERVEL should first apply user/agent relevance, impact and noise scoring. Both remain exact Workspace scoped.

Polling is bounded in v0.1. A durable cursor tracks progress and delivery receipts make surfaced signals auditable/idempotent. Push transports can later consume the same subscription records without changing event semantics.
