# CERVEL Knowledge Automation & Source Connectors

PR #7 introduces read-only knowledge synchronization for Google Drive, Dropbox, and Microsoft OneDrive.

## Trust boundaries

Provider OAuth tokens are encrypted before persistence with `CERVEL_CONNECTOR_TOKEN_KEY`. Connector OAuth state is single-use, short-lived, and bound to the authenticated CERVEL Node, Workspace, Principal, and provider. The browser never supplies tenant scope during the callback.

The scheduler endpoint is internal-only and requires `X-CERVEL-AUTOMATION-KEY`. Provider access is read-only in this release.

## Sync lifecycle

`Connected account -> Watched source -> Due check -> Provider metadata/content -> SHA-256 comparison -> unchanged OR new CKO/snapshot artifact -> ingestion -> embeddings -> freshness state -> knowledge health`

A source keeps the same CKO across remote revisions. Changed bytes create a new immutable artifact and increment the CKO version. Unchanged bytes do not create duplicate artifacts.

## Freshness

Each watch has a sync interval and `next_sync_at`. A source becomes stale after three missed freshness windows. Sync failures, expired authorization, and stale sources create deduplicated knowledge-health notifications.

## Scheduler

Call `POST /v1/internal/connectors/sync-due` from a trusted scheduler with `X-CERVEL-AUTOMATION-KEY`. A Cloud Scheduler or equivalent job every five minutes is recommended; individual source intervals still control whether a source is due.

## Provider configuration

Set the provider client ID, client secret, and exact callback URL shown in `.env.example`. Redirect URIs registered with Google, Dropbox, and Microsoft must exactly match the deployed CERVEL API URLs.
