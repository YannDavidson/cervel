# Vault Explorer Convergence

PR #82 turns the richer Vault Explorer product surface into a real runtime view over CERVEL state.

The Explorer does not own a second knowledge hierarchy. It navigates the active local Vault, canonical CERVEL Knowledge Objects (CKOs), first-party capture types, and Life / Enterprise semantic views already backed by persistent corpus memberships.

## Runtime model

**Local Vault → workspace → canonical CKO → artifacts/fragments/claims → semantic memberships → Explorer projection**

The Desktop bridge discovers actual Vault manifests under the user's CERVEL Vault directory. Once a Vault is unlocked, the renderer requests Explorer state through native Tauri commands. The native bridge attaches the Local Node token and principal identity; these credentials never enter renderer JavaScript.

`GET /v1/local/explorer` exposes the active workspace collections and permission-aware semantic view navigation. `GET /v1/local/explorer/objects` navigates canonical CKOs by search, type, corpus, and Mega Tab. `GET /v1/local/explorer/objects/:id` exposes the selected object's canonical state, visible corpus memberships, artifacts, versions, and provenance-backed activity.

## Collections

Notes, Files, and Sources are not UI counters. Their counts come from persisted `knowledge_objects` by real CKO type. **All CKOs** is the canonical object population in the active workspace.

Life and Enterprise navigation comes from the runtime corpus taxonomy and membership projection introduced by PRs #80 and #81. Selecting a semantic view filters references to CKOs; it never copies or moves knowledge.

## Activity and Properties

The Activity rail is backed by `provenance_events` / `provenance_io`, including events attached directly to a CKO or to its artifacts and fragments. The Properties rail is backed by canonical CKO state and persisted semantic memberships, including lifecycle state, epistemic state, object version, artifacts, fragments, claims, timestamps, and visible corpus membership coordinates.

No synthetic demo event, hard-coded count, or presentation-only object state is promoted into the runtime.

## Permission boundary

Semantic navigation and membership display preserve the same Life sealed-access and Enterprise tenant-membership checks as corpus reads. Corpus visibility/grants are checked before a membership can influence Explorer navigation. The renderer receives only already-authorized Explorer responses and never receives the Local Node authentication token.
