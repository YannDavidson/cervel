# Ingestion Worker

Pipeline:
source -> security/MIME -> SHA-256 -> object storage -> Artifact -> CKO -> extraction -> Fragments

Persistent original artifacts require a provenance event.
Fragments should use native semantic structure where possible.
