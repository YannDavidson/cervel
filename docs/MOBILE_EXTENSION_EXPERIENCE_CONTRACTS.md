# CERVEL Mobile + Extension Experience Contracts

CERVEL uses one design language and one set of knowledge contracts across clients, while allowing each embodiment to optimize for its device and interaction model.

## Mobile

Mobile is not a compressed Desktop workspace. Its primary experience is fast capture and intelligence on the move:

- text/share capture
- voice capture
- camera capture
- Search
- Ask CERVEL
- lightweight Vault/Corpus navigation

Every mobile capture path must preserve admission, identity, permission, and provenance semantics from the canonical CERVEL runtime.

## Browser extension

The extension is intentionally focused. It does **not** embed the full Desktop workspace into a popup.

Its core responsibilities are:

- capture the current page
- capture a user selection
- activate current-page/selection context for Search or Ask CERVEL
- preserve source URL/page/selection provenance
- remain behind the canonical runtime permission boundary

The extension consumes the shared `capture.admission`, `retrieval.search`, and `reasoning.ask` contracts, while its presentation remains optimized for a small browser surface.

## Shared versus surface-specific

Shared across clients:

- brand and design tokens
- canonical CKO identity
- capture/admission contracts
- retrieval and reasoning contracts
- permissions and provenance
- runtime capability semantics

Surface-specific:

- mobile voice/camera/share affordances
- mobile navigation and gesture patterns
- extension current-page and selection capture
- extension context activation
- compact extension popup presentation

The rule is:

**shared product contracts + embodiment-specific UX**

not:

**one Desktop UI forced into every client**.
