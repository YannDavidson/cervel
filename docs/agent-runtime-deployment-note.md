# Deployment note

Deploy migration 021 before enabling Agent Runtime routes. The migration is additive and does not modify existing CERVEL records.

The current alpha runtime continues to identify callers with `X-CERVEL-PRINCIPAL-ID`; PR #12 builds agent authorization on top of that existing boundary. Production-grade agent credential issuance is a follow-up security layer and should resolve into the same CERVEL principal/Workspace grant model rather than bypass it.
