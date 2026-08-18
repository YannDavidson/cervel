# Autonomy boundary

PR #12 gives agents knowledge capabilities, not unrestricted action authority. Reading context, persisting observations, asserting claims, and consuming signals are distinct from executing external side effects.

Future action runtimes should require their own grants, approval policies, budgets, and receipts rather than treating `memory:write` or `events:read` as permission to act.
