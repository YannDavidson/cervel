# Reconnect semantics

Re-authorizing the same provider account in the same Workspace upserts the existing source connection using the verified provider account subject, preserving watched-source references while replacing expired access credentials and retaining a refresh token when the provider does not issue a new one.
