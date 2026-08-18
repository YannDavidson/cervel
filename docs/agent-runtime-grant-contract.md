# Agent Workspace grant contract

`agent_workspace_grants` is the decisive authorization layer for Agent Runtime. A grant must match agent identity, Node and Workspace. Permission checks occur after that exact match.

The permission array is deliberately explicit and narrow. Identity `capabilities` are descriptive and cannot substitute for a grant. Node membership alone cannot substitute for a grant. A resource UUID alone cannot substitute for a grant.

This makes multi-tenant agent deployment possible without giving one agent ambient access to every Workspace its Node can host.
