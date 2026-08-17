# Principle: refresh credentials server-side

Offline refresh tokens are never returned to the browser after callback. Access renewal occurs inside the connector runtime, and inability to refresh becomes an explicit reauthorization-required state.
