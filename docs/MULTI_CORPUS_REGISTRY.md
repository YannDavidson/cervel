# Multi-Corpus Registry & Universal Corpus Runtime

PR #92 expands CERVEL from the Life/Enterprise product surface to a universal ten-corpus runtime while preserving the canonical CKO as the sole source of truth.

## Canonical corpora

1. Life
2. Enterprise
3. Knowledge
4. World
5. Civilization
6. Machine
7. AI
8. Experience
9. Resource
10. Civic / National

Each corpus owns a deterministic taxonomy with semantic branches and subfolders. Life and Enterprise retain their specialized privacy, sealed-branch, tenant, scope, and authority policies.

## Runtime behavior

- `ensureBuiltinCorpora` upgrades incomplete registries in place and creates missing canonical corpora without rewriting CKOs.
- Object creation, capture ingestion, and Knowledge Compiler materialization continue to invoke the Corpus Engine automatically.
- Classification uses canonical CKO content plus metadata, tags/topics, jurisdiction/language context, hooks, and installed taxonomy rules.
- One CKO may receive multiple memberships across multiple corpora and multiple branches inside the same corpus.
- Memberships remain references in `corpus_memberships`; content and artifacts are never copied into corpus folders.
- Manual filing wins over future automatic classification at the same coordinate.
- Removing a membership creates a persisted suppression override so an automatic classifier cannot silently recreate it later.

## Embodiments

The Local Node/API is the shared corpus authority for Desktop, browser capture, mobile capture, cloud/runtime surfaces, SDK consumers, Intelligence Gateway, and Agent/MCP consumers. Desktop Alpha reads the same registry and exposes all ten corpora in Vault Explorer.

## API surface

The runtime exposes corpus listing/detail/taxonomy, universal runtime views, classification/reclassification, membership inspection/add/remove, and permission-aware corpus browsing. These interfaces are model-independent and operate on canonical CKO references.

## Boundaries

- No second knowledge store.
- No duplicated canonical CKOs.
- Life sealed visibility remains authoritative.
- Enterprise tenant boundaries remain authoritative.
- Corpus visibility and access grants remain authoritative.
- User classification overrides persist across reclassification.
- Existing Life/Enterprise installations are refreshed in place rather than replaced.
