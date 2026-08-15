# CERVEL v0.1 Starter Repository

CERVEL is a sovereign knowledge operating system / knowledge infrastructure layer for humans and AI.

This starter repository implements the first frozen contracts:

- CKO Schema v0.1
- CKURI v0.1
- Claim + Relationship contracts
- Provenance Event v0.1
- CCP v0.1
- PostgreSQL migrations 001–006

## Core invariant

**Knowledge identity is independent from storage and model providers.**

## Recommended local stack

- PostgreSQL 16+ with `pgvector`
- S3-compatible object storage (MinIO is suitable for local development)
- TypeScript/Node API
- Background workers for ingestion/enrichment
- Any model provider behind `ModelAdapter`

## Migration order

```text
001_core_identity.sql
002_knowledge_objects.sql
003_graph_claims.sql
004_provenance_models.sql
005_permissions.sql
006_context_packages.sql
```

## Build sequence

1. Run PostgreSQL + pgvector.
2. Apply migrations 001–006.
3. Implement UUIDv7 creation/validation.
4. Implement CKURI resolver.
5. Implement artifact upload + SHA-256.
6. Extract stable fragments from PDF/text.
7. Add lexical search.
8. Add embeddings.
9. Enforce permission-first retrieval.
10. Assemble CCP.
11. Add one model adapter.
12. Return cited answer + Trace.

## Non-negotiable security rule

Never retrieve globally and filter unauthorized content afterward.

```text
principal
  -> policy scope
  -> authorized knowledge universe
  -> retrieval
  -> ranking
  -> CCP
  -> model
```

## v0.1 is done when

A user can capture a source, receive a stable CKO/CKURI, ask a question, generate a permission-scoped CCP, receive a cited answer, and trace it to the original artifact.
