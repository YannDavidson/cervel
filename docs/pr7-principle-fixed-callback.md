# Principle: OAuth redirect URIs are deployment configuration

Redirect URIs come from server configuration and must exactly match provider registration. They are never accepted from request bodies or query parameters, preventing caller-controlled callback destinations.
