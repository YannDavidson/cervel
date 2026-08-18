# Agent Knowledge Runtime v0.1

PR #12 makes CERVEL a durable knowledge substrate for internal and external AI agents.

## Contract

An agent is represented by a normal CERVEL principal plus an `agent_identity`. Access is never inferred from provider identity alone. Every runtime operation resolves an explicit Node + Workspace grant and a named capability permission.

Permissions in v0.1 are `memory:read`, `memory:write`, `claim:write`, `context:read`, `events:read`, and `watch:read`.

## Runtime loop

`Agent identity → Workspace grant → Read memory / write observation → optional durable Claim → CCP assembly → Knowledge Event / Watch subscription → delivery receipt → acknowledgement`

Observations preserve agent identity, Workspace, subject, confidence, details, and any Claim created from the observation. Claims carry the agent and Workspace in qualifiers so later reasoning can preserve provenance.

## CCP consumption

Agents do not receive a bypass retrieval path. `/v1/agent/context` calls the existing Context Package assembler under the agent principal and exact Workspace scope. This keeps retrieval, permissions, evidence selection, provenance, and future policy changes aligned with human CCP consumption.

## Signals

Agent subscriptions can consume Workspace-scoped Knowledge Events and Watch alerts. A subscription may filter event types, bind to a Watch, set a minimum confidence, and advance a durable cursor. Delivery receipts make signal consumption idempotent and auditable.

## Security posture

Agent identity is a principal, not an API superuser. Node membership is necessary but not sufficient: the exact Workspace grant and operation permission must also exist. The runtime never loads observations, events, alerts, or CCPs from a different Workspace. Watch alerts remain principal-owned.

## v0.1 delivery boundary

This PR provides the server-side runtime and pull-based signal contract. Provider-specific authentication, signed agent tokens, streaming transports, MCP/A2A adapters, webhook delivery, quotas, and agent delegation are intentionally left for subsequent PRs so the permission and provenance core can stabilize first.
