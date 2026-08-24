# CERVEL Corpus Engine v1

The Corpus Engine turns the CERVEL Corpus Architecture into runtime organization without creating another storage hierarchy. A CKO remains the canonical knowledge identity. Artifacts, fragments, claims, provenance, versions, and Semantic Kernel bindings continue to reference that identity.

A corpus is a versioned registry definition plus a mega-tab / tab / subtab taxonomy. `corpus_memberships` stores only a CKO identifier, semantic coordinates, confidence, reasons, and the classification source. The same CKO can belong to any number of corpora and coordinates. `corpus_cko_semantic_view` resolves those memberships against the canonical CKO at query time, so updates appear everywhere immediately and no content or file is duplicated.

Built-in registries are Life, Enterprise, Knowledge, World, Civilization, Machine, AI, Experience, and Resource. Nodes may add custom corpora or extend an existing definition. Visibility is evaluated per corpus (`public`, `node`, `restricted`, or `private`) with explicit grants for restricted/private access.

Classification combines deterministic built-in rules with node-defined event hooks. Every run creates a receipt containing the input digest, proposed multi-membership candidates, accepted membership IDs, trigger, engine version, confidence, and reasons. Passing `accept=false` provides a suggestion-only path.

## API surface

- `POST /v1/corpora/bootstrap` installs or updates the nine built-in registries for a workspace.
- `GET /v1/corpora` returns only registries visible to the principal.
- `POST /v1/corpora` creates a custom corpus or extension.
- `POST /v1/corpora/:id/hooks` adds an auto-classification hook.
- `PUT /v1/corpora/:id/grants/:principalId` grants view, classify, or manage access.
- `POST /v1/corpora/classify/:ckoId` classifies one canonical object and records a receipt.
- `POST /v1/corpora/:id/memberships` adds a manual semantic filing.
- `GET /v1/corpus-view` queries canonical CKOs through corpus/taxonomy filters.

The engine never stores artifact bytes, copied text, or a corpus-specific CKO representation. Once a workspace registry exists, ordinary CKO creation invokes classification automatically in the same transaction.
