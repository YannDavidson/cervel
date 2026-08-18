# Agent Knowledge Runtime — v0.1 threat model

Primary boundary: an AI agent is untrusted application code operating as a CERVEL principal. It receives no implicit authority from being internal, external, autonomous, or provider-hosted.

## Defenses

- **Cross-tenant reads/writes:** every agent operation resolves `agent_identity + node_id + workspace_id + permission`; storage queries repeat Node + Workspace scope.
- **Privilege escalation:** grants are explicit capability strings; Claim creation requires `claim:write` in addition to memory write.
- **Context bypass:** agents consume the existing CCP assembler under their own principal, preserving the retrieval permission pipeline.
- **Provenance laundering:** observations store agent identity and optional Claims include `workspace_id`, `agent_id`, and `source=agent_runtime` qualifiers.
- **Signal leakage:** subscriptions are bound to the agent, Node, and Workspace; Watch alerts remain restricted to the agent principal.
- **Replay/duplication:** delivery receipts have unique subscription/event and subscription/alert indexes; subscription cursors advance monotonically after bounded reads.
- **Runaway polling:** each signal pull is capped at 100; v0.1 has no background polling daemon.

## Deferred hardening

Signed short-lived agent tokens, credential rotation, per-agent rate/compute quotas, delegation chains, approval policies for high-impact writes, streaming/webhook delivery, MCP/A2A adapters, and cryptographic request attestations belong in later runtime/security PRs.
