# Agent Runtime guardrails

The core guardrails are structural rather than prompt-based: dedicated principal identity, exact Workspace grant, operation-specific permission, transactional writes, provenance on promoted Claims, existing CCP retrieval permissions, principal-owned Watch alerts, bounded signal pulls and durable receipt uniqueness.

Prompt instructions may guide an agent's behavior, but they are not accepted as authorization controls in PR #12.
