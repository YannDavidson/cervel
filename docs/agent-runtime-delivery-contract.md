# Agent signal delivery contract

A subscription is owned by one agent and one Workspace. Signal pulls are ordered oldest-first after `cursor_at`, capped to a caller limit of at most 100, persisted as delivery receipts, then advance the subscription cursor to the newest returned occurrence.

Delivery uniqueness is enforced separately for subscription+Event and subscription+Watch-alert. A receipt may be acknowledged later. This provides a durable base for future push transports while keeping v0.1 simple and pull-based.
