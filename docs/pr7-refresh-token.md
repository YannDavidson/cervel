# Refresh-token behavior

When an access token approaches expiry, CERVEL refreshes it server-side. If the provider returns a new refresh token it replaces the encrypted old value; otherwise the existing refresh token is retained. Refresh failure transitions the connection to `reauth_required`.
