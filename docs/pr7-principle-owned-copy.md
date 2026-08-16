# Principle: preserve an owned source copy

A cloud-drive connector should not make CERVEL retrieval depend on the provider being online at query time. Successful sync stores source bytes as CERVEL artifacts, so existing knowledge remains available when upstream authorization or availability later fails.
