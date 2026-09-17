# Canonical Desktop Visual Convergence

PR #88 makes the canonical Tauri Desktop unmistakably CERVEL while preserving the real runtime and trust boundaries already established in Alpha.4.

## Visual direction

The Desktop uses an Apple-style product language: restrained glass/translucency, strong spacing, a dark sovereign sidebar, bright semantic workspace surfaces, rounded cards, subtle depth, and a focused information hierarchy. The approved CERVEL logo and `Sovereign Knowledge` descriptor anchor the product identity.

The Home experience follows the approved reference composition:

- dark persistent sidebar with Vault and Local Node state;
- global Vault search and runtime/corpus controls;
- strong CERVEL hero with Ask and Add knowledge actions;
- local ownership, provenance, model independence, and zero-duplication value cards;
- Life / Enterprise semantic preview backed by real corpus membership counts;
- right-side activity rail backed by real provenance activity;
- a Local Node / encrypted Vault status strip.

## No synthetic product state

The canonical Desktop must not populate visual cards with invented counts, fake activity, or a synthetic demo switch. `home-experience.js` obtains runtime state through native Tauri commands:

- `node_status`
- `vault_explorer`

Semantic counts come from the existing corpus runtime exposed through Vault Explorer. Activity comes from persisted provenance events. If the Local Node is offline, the UI shows that state rather than inventing data.

## Brand asset boundary

The canonical logo remains `packages/shared-experience/assets/brand/cervel-logo.png`. `scripts/prepare-tauri-ui.ts` copies it byte-for-byte into the Tauri frontend distribution before launch. CI verifies the prepared asset has the approved SHA-256:

`18dc78ba39e85b0db6a27c107e86382f42f8e4d67f41e1a3afbadebbbaed0f13`

No runtime network request or third-party image host is introduced.

## Product boundary

This PR is presentation and experience convergence, not a new knowledge runtime. Capture, Search, Ask, Trace, Graph, Deliverables, Connections/MCP, Vault Explorer, corpus authorization, and Local Node credentials retain their existing canonical/native boundaries.
