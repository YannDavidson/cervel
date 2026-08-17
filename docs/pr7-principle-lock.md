# Principle: one source, one revision writer

Concurrent synchronization of the same watched source must not race into duplicate revisions. PR #7 uses row locking as the Alpha single-writer mechanism; a lease/queue can replace it at scale while keeping the invariant.
