# Future agent teams

PR #12 is deliberately single-agent in authorization: every runtime request resolves one principal and one agent identity. Shared agent-team memory should later be modeled explicitly rather than achieved by multiple agents sharing credentials.

A team layer can grant several agent principals access to a shared Workspace, preserve per-agent observation/Claim provenance, and introduce delegated task context without weakening the identity/grant invariants established here.
