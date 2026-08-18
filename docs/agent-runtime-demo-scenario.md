# Demo scenario

A project agent is granted one Workspace. It records an observation against a project CKO and creates a `claimed` assertion. It requests a CCP before planning. Later, Knowledge Evolution detects a launch risk, Impact marks the project `requires_review`, and the agent-owned Watch surfaces an alert. The subscription returns both the underlying Event and the Watch alert with a durable receipt.

A second Workspace remains invisible throughout the flow.
