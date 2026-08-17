# Principle: external authorization never selects internal tenancy

Provider OAuth proves access to an external account. It does not authorize a CERVEL Node or Workspace. Internal tenant scope is bound before redirect in a CERVEL-authenticated challenge and recovered server-side at callback.
