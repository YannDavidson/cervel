# Primitive reuse

PR #12's architecture is intentionally thin because CERVEL already has the hard knowledge primitives. Agent identity references `principals`; tenant scope references `workspaces`; semantic writes use `claims`; context uses `context_packages`; change uses `knowledge_events`; relevance/noise uses `knowledge_watches` and `watch_alerts`.

The new tables exist only where agent-specific durable state is actually required: identity metadata, grants, observations, subscriptions and delivery receipts.
