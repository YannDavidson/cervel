# Principle: manual and automatic sync share one engine

Sync now and scheduled synchronization invoke the same `syncWatch` logic. This prevents separate code paths from drifting on hashing, versioning, ingestion, or health behavior.
