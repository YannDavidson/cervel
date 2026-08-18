# Agent Runtime failure semantics

Identity, Node, Workspace, capability, subject scope, and Watch ownership failures are hard authorization failures; the runtime does not silently broaden scope. Invalid permission vocabulary and malformed observation/context requests fail before persistence.

Signal polling is bounded and receipt insertion is idempotent. A failed transaction does not advance the subscription cursor.
