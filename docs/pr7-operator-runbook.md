# Operator runbook

If a provider source errors: inspect the latest `source_sync_runs` row, then connection status. `reauth_required` needs user reconnection; storage/config errors need infrastructure correction; stale without recent failures suggests scheduler interruption. Existing CKO knowledge remains available while the source is unhealthy.
