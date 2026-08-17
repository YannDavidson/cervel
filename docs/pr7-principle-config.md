# Principle: connector configuration should fail locally, not globally

A missing Dropbox secret should make Dropbox unavailable, not prevent CERVEL from booting or Google Drive from working. Provider configuration is therefore resolved only when that provider path is invoked.
