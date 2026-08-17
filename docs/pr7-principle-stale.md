# Principle: freshness depends on success

Polling a source and failing does not make it fresh. Staleness is calculated from `last_success_at`, while `last_checked_at` separately records attempted observation.
