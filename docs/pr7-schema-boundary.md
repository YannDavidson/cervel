# Schema boundary

PR #7 migrations are additive. Migration 011 remains byte-for-byte historical; migration 013 explicitly extends the auth-challenge kind constraint. This avoids changing already-applied migration semantics on existing CERVEL installations.
