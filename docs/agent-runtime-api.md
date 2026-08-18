# Agent Runtime API v0.1

Administrative endpoints create an agent identity and grant Workspace capabilities. Agent endpoints expose session scope, durable observation write/read, CCP creation, signal subscription/polling, and delivery acknowledgement.

All agent calls authenticate through the existing CERVEL principal header in v0.1. External provider credentials are metadata on the agent identity; token exchange and signed machine credentials are intentionally deferred to a later authentication protocol layer.
