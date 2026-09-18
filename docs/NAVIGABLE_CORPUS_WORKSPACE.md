# Navigable Corpus Workspace

PR #91 turns Life and Enterprise from flat semantic filters into navigable knowledge workspaces.

## Product behavior

The Desktop reads the installed corpus taxonomy from the Local Node. Life exposes its 17 canonical branches and Enterprise exposes its 18 canonical branches. Each branch expands into its canonical subtabs. These folders are semantic views over canonical CKOs; they never copy the underlying object or artifact.

Selecting a branch or subfolder filters Vault Explorer through the permission-aware `corpus_cko_semantic_view`. A folder can be empty and still exist, so the information architecture is visible before knowledge is captured.

When the user chooses **+ Add knowledge here**, Note, File, and Source capture still create a canonical CKO first. CERVEL then adds a manual semantic membership for the selected folder. Life filing preserves Life sensitivity/sealed rules. Enterprise filing resolves an authorized active tenant and records the filing with reported authority; ambiguous tenant context is rejected rather than guessed.

If semantic filing fails after canonical capture, the Desktop reports that distinction and does not claim the capture was rolled back.

## Boundaries

- One canonical knowledge store.
- Folder membership is a reference/projection, not duplicated content.
- Sealed Life branches retain their access controls.
- Enterprise tenant membership remains mandatory.
- Local Node credentials remain native-side and never enter renderer JavaScript.
