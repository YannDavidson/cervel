# Principle: provider-specific at the edge, CERVEL-specific at the core

OAuth endpoints and download mechanics vary by provider; CKO identity, hashing, versioning, ingestion, Library routing, freshness, health, and retrieval should not. This keeps additional connectors incremental rather than architectural forks.
