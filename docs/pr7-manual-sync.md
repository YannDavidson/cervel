# Manual sync

`POST /v1/watched-sources/:id/sync` provides an authenticated Sync now action. The route verifies the watched source belongs to the resolved Node/Workspace before invoking the same synchronization engine used by automation.
