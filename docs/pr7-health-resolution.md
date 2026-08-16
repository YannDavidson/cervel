# Health resolution

The schema supports `resolved_at`; current PR #7 emission focuses on opening/deduplicating active conditions. A small follow-up should automatically resolve stale/failure/reauth alerts after a successful sync or reconnect and optionally emit the reserved informational `source_recovered` signal.
