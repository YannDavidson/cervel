# Security posture

The connector layer is read-only upstream, tenant-bound downstream, encrypts reusable provider credentials, authenticates scheduler execution separately, limits remote byte volume, and keeps provider IDs subordinate to CERVEL CKO identity. No generic arbitrary-URL fetch endpoint is introduced.
