# Principle: scheduler cadence is not source cadence

A frequent dispatcher can safely service sources with different freshness requirements because each watch persists its own next-due time. This avoids creating one global synchronization frequency for all knowledge.
