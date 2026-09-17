# Ask / Search / Trace / Graph Convergence

PR #83 converges the richer CERVEL intelligence experience onto the real Local Node retrieval, reasoning, provenance, and graph runtime.

## Canonical flow

`Search → authorized hybrid retrieval → CKO/fragment evidence`

`Ask CERVEL → permission-aware context compilation → Intelligence Gateway → cited answer → protected Trace → source CKO/artifact/fragment`

`Graph → permission-aware workspace projection → evidence-backed claims → entities/relationships`

The Desktop renderer never receives the Local Node token or reads `desktop-session.json`. Search, Ask, Trace, and Graph all cross the existing native Tauri bridge, which applies the active Vault identity and authenticated Local Node boundary.

## Search

Desktop Search calls the canonical `/v1/search` route. That route resolves the principal retrieval scope, workspace, libraries, policy snapshot, and allowed CKO IDs before hybrid lexical/semantic retrieval. Results are fragment-level evidence with canonical CKURI citations and scores; selecting a result opens the canonical CKO in Vault Explorer rather than creating a second search-owned object model.

## Ask and evidence

Ask CERVEL remains on `/v1/reason`. The answer view renders the clean answer and canonical citations, then loads `/v1/answers/:id/trace` to expose the authorized evidence behind the answer. Evidence text is treated as display-only untrusted content and escaped before insertion into the renderer.

No evidence is promoted to executable instructions and no renderer-to-provider path is introduced.

## Trace

Trace remains principal-bound answer lineage. The shared experience exposes claim, fragment, artifact, SHA-256, source CKO, conflicts, and intelligence receipts where the runtime provides them. Source links return to the same canonical CKO in Vault Explorer.

## Graph

The Local Node graph projection is tightened in this PR. It now requires both node and workspace scope and resolves the same retrieval policy used by Search/Ask. Only semantic relationships whose claim evidence belongs to an allowed, non-deleted CKO in the active workspace may enter the projection.

Each graph edge carries its claim ID, evidence fragment ID, and source CKO ID so the relationship remains inspectable back to canonical evidence. The graph is a projection; it does not duplicate CKOs, claims, entities, or provenance.

## Security and sovereignty invariants

- Local Node credentials remain native-side only.
- Search and Ask use existing permission-aware retrieval/context compilation.
- Trace is principal-bound and cannot be fetched for another principal's answer.
- Graph is workspace-scoped and retrieval-policy-scoped.
- Evidence and graph labels are escaped before renderer insertion.
- No synthetic demo state is promoted into production surfaces.
- Canonical CKOs remain the durable source of truth across Search, Ask, Trace, Graph, and Vault Explorer.
