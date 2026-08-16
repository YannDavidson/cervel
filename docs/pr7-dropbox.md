# Dropbox behavior

Dropbox content download returns file metadata in the `Dropbox-API-Result` response header. PR #7 retains the revision and server-modified time for diagnostics and hashes the downloaded bytes before deciding whether CERVEL knowledge changed.
