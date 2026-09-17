# Corpus Runtime — Life / Enterprise

PR #80 promotes **Life** and **Enterprise** from presentation/demo concepts into first-party runtime semantic views over canonical CERVEL Knowledge Objects (CKOs).

The runtime does **not** copy knowledge when a user switches views. `corpus_memberships` stores semantic coordinates and access context that reference a canonical `knowledge_objects.id`. The runtime reads those references through `corpus_cko_semantic_view` and projects each CKO once per response with one or more membership records attached.

## Runtime endpoints

`GET /v1/corpus-runtime?node_id=<id>&workspace_id=<id>` lists the available Life and Enterprise corpus views visible to the current principal.

`GET /v1/corpus-runtime/life?node_id=<id>&workspace_id=<id>` and `GET /v1/corpus-runtime/enterprise?node_id=<id>&workspace_id=<id>` return read-only semantic projections. The response reports `canonical_cko_count`, `membership_count`, and `duplication_policy: canonical-cko-references-only`.

View switching is deliberately read-only. It does not create CKOs, artifacts, or corpus memberships. Classification and filing remain separate admission operations.

## Permission boundary

The runtime reuses the existing permission-aware corpus query path. Life sealed branches remain subject to active sealed-access sessions. Enterprise memberships remain subject to enterprise tenant membership. A view cannot bypass corpus visibility, tenant, or sealed-branch rules.

## Canonical identity

A single CKO may appear in both Life and Enterprise when it has memberships in both. Its `cko_id` remains identical across views. Different semantic memberships describe different organization or authority contexts; they are not copies of the underlying knowledge.

This keeps the product model explicit:

**Vault → canonical CKO → corpus membership → semantic view**

not:

**Vault → duplicated Life copy / duplicated Enterprise copy**.
