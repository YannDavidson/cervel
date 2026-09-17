# Mega Tabs / Semantic Views

PR #81 promotes CERVEL Mega Tabs from presentation labels into runtime semantic views backed by persistent corpus memberships.

For the Life Corpus, the first-party Mega Tabs are defined by the installed Life taxonomy: Personal, Relationships & Family, Health, Work & Career, Education, Projects, Finance, Home, Memory, Personal Knowledge, Digital Life, Travel, Hobbies, Goals, Civic / Community, Legal / Administrative, and Legacy. Enterprise uses its own installed first-party taxonomy.

## Runtime contract

`GET /v1/corpus-runtime/:view/semantic-views?node_id=<id>&workspace_id=<id>` returns the taxonomy nodes for `life` or `enterprise` plus counts derived from the persistent `corpus_cko_semantic_view`.

Each Mega Tab reports:

- `canonical_cko_count`: distinct canonical CKOs visible in that semantic view.
- `membership_count`: visible semantic membership records in that view.
- `latest_cko_updated_at`: the most recent canonical-object update represented in that view.

The response also reports corpus-wide distinct canonical-object and membership counts. Corpus-wide canonical-object totals are computed directly with `COUNT(DISTINCT cko_id)` rather than summing Mega Tab counts, because one canonical CKO may legitimately belong to multiple semantic views.

## Persistence and classification

Counts are never product/demo constants. They reflect rows admitted to `corpus_memberships` by real classification or filing operations and resolved against canonical CKOs through `corpus_cko_semantic_view`. Empty taxonomy views remain visible with zero counts so navigation is stable while knowledge grows.

Changing a semantic view does not move or duplicate knowledge. A CKO may belong to Personal Knowledge, Projects, and Work & Career simultaneously while remaining one canonical object.

## Permission boundary

Counts use the same security boundaries as corpus reads. Life sealed memberships are counted only with an active sealed-access session. Enterprise memberships are counted only when the requesting principal belongs to the relevant tenant. Corpus visibility/grants are checked before taxonomy or counts are returned.

Canonical model:

**Vault → canonical CKO → persistent corpus membership → Mega Tab / semantic view**

not:

**Vault → hard-coded tiles or duplicated knowledge copies**.
