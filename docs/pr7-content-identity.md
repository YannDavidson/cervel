# Content identity rule

Remote provider version identifiers are hints; CERVEL content identity is SHA-256 over downloaded bytes. This makes changed-document behavior consistent across Google Drive, Dropbox, and OneDrive and protects against provider metadata-only revision churn.
