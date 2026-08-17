# Connector byte limit

Remote source content is capped by `CERVEL_CONNECTOR_MAX_BYTES`, defaulting to 25 MiB to match the current API body posture. Larger-file streaming/chunked ingestion should be implemented before raising this limit materially.
