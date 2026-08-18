# Agent Runtime + CCP

Context Packages are the key interoperability boundary in PR #12. The agent runtime verifies `context:read`, then delegates to `assembleContextPackage` with the agent principal and exact Workspace.

This means an agent receives CERVEL context through the same evidence/Claim packaging machinery already used by reasoning. It also gives later execution tracing a stable context-package ID that can answer what knowledge was available to the agent at task time.

No agent-only raw vector-search bypass is added.
