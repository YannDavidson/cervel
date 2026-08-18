# Final review focus for PR #12

Before promotion, inspect every SQL statement that touches `agent_observations`, `context_packages`, `knowledge_events`, `watch_alerts`, `agent_subscriptions`, and `agent_delivery_receipts` for exact tenant/principal predicates.

Then inspect every capability transition: administrator → agent identity; administrator → Workspace grant; agent → observation; observation → Claim; agent → CCP; agent → subscription; subscription → signal/receipt. There should be no path where provider metadata, agent kind, Node membership alone, or possession of a resource UUID substitutes for the required Workspace grant.
