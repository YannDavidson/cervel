# OAuth callback paths

Google Drive: `/v1/connectors/google_drive/callback`

Dropbox: `/v1/connectors/dropbox/callback`

OneDrive: `/v1/connectors/onedrive/callback`

Register the exact deployed scheme/host/path with each provider; redirect mismatch should be treated as configuration failure, not worked around dynamically.
