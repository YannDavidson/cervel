# Principle: credentials must not become observability payloads

Connector APIs expose normalized state, and future logging should avoid raw token exchange/refresh bodies. Access/refresh tokens are secret material whether encrypted at rest or freshly received from a provider.
