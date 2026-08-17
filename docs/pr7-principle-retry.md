# Principle: retries should preserve idempotency

A failed or repeated scheduler invocation may run again. Connection/watch uniqueness, source locking, hash-based unchanged detection, and conflict-safe Library membership keep repeated execution from multiplying knowledge objects or artifacts unnecessarily.
