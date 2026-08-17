# Principle: Alpha correctness before distributed throughput

PR #7 chooses simple row-serialized synchronization for correctness. Queue leases, streaming, provider concurrency budgets, and delta/webhook fan-out are scale optimizations that should preserve the same source/CKO/version/health invariants.
