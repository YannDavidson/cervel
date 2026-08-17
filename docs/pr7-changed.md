# Changed synchronization

When SHA-256 differs, CERVEL keeps the stable source-to-CKO mapping, increments object version for an existing CKO, records a version snapshot, registers the new immutable source artifact, runs ingestion/embedding when supported, and advances the source-document pointer/hash.
