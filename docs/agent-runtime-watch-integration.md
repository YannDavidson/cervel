# Agent Runtime + CERVEL Watch

PR #11 made CERVEL proactive for principals. PR #12 lets an agent principal consume that same intelligence rather than introducing agent-specific alert scoring.

A Watch still owns intent, focus, scoring, impact explanation and cooldown. The Agent Runtime only controls whether the agent may consume signals in the Workspace and maintains delivery cursor/receipts.

For Watch-bound agent subscriptions, the alert query requires `watch_alerts.principal_id` to equal the agent principal. This prevents an agent from subscribing to another user's private Watch inbox even when both principals belong to the same Node/Workspace.
