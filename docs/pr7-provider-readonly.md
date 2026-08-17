# Read-only provider access

PR #7 never writes, renames, moves, or deletes cloud-drive content. Provider authorization exists solely to identify the connected account, inspect selected source metadata, download user-authorized content, and refresh read access.
