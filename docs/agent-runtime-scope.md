# PR #12 scope boundary

Included: agent identity records; exact Workspace grants; granular runtime permissions; durable observation memory; optional Claim materialization; CCP consumption; Event/Watch subscriptions; bounded cursor polling; delivery receipts and acknowledgement; migration, API, documentation and integration validation.

Excluded: autonomous task scheduling, model invocation, tool execution, provider credential storage, API key issuance, OAuth for agents, MCP/A2A protocol servers, streaming/push transports, billing, rate limiting, delegation chains, multi-agent orchestration and human approval workflows.

Keeping those concerns outside PR #12 makes the permission/provenance contract independently testable and avoids coupling CERVEL's durable knowledge layer to one generation of agent frameworks.
