# Release criteria

The implementation is acceptable only if the system can demonstrate both sides of the security contract in the same real database: a properly granted agent successfully writes durable memory/Claim provenance, and that same authenticated agent is rejected when it requests an ungranted Workspace.

A successful happy path without the negative tenant test is insufficient for PR #12.
