# CERVEL Knowledge Automation & Source Connectors

Adds read-only Google Drive, Dropbox, and OneDrive connections; encrypted offline credentials; Workspace-scoped watched sources; due/manual synchronization; SHA-256 change detection; stable CKO identity with automatic artifact/version re-ingestion; optional Library routing; freshness state; Knowledge Health; sync-run audit history; worker/scheduler entrypoints; migrations 012-015; and a dedicated integration lane.

Security boundaries: single-use provider-bound OAuth state, provider-verified account identity, encrypted tokens, no token serialization, read-only scopes, Workspace/Library scope constraints, separate automation secret, remote byte cap, and no arbitrary URL fetch API.

Deployment requires provider OAuth credentials and scheduler configuration; CI intentionally validates CERVEL-controlled contracts without third-party secrets.
