# CERVEL External AI and Agent Gateway

The gateway lets external assistants and agents use CERVEL without turning the Vault into provider-owned memory. ChatGPT, Claude, Gemini, IDEs, and agent runtimes connect through the same Model Context Protocol (MCP) boundary and receive only the authority explicitly granted to that client.

## MCP server

Run `npm run start:mcp` with `CERVEL_NODE_URL` and a short-lived `CERVEL_ACCESS_TOKEN`. The stdio server implements MCP initialization, tool discovery, ping, and tool calls for:

- `cervel_search` — permission- and library-scoped retrieval;
- `cervel_reason` — cited CERVEL reasoning over the granted scope;
- `cervel_trace` — Answer provenance and reasoning trace inspection;
- `cervel_propose_write` — an immutable mutation proposal, never a direct write.

Because the interface is MCP rather than provider-specific, one policy and audit layer covers ChatGPT MCP/connectors, Claude MCP, Gemini/agent bridges, IDE hosts, and custom agents.

## Authorization

Public clients use an OAuth-style device flow: register a client, request a device/user code, approve it inside CERVEL, and exchange the one-use device code for an opaque bearer token. Only SHA-256 token digests are stored. Grants bind principal, node, optional workspace, libraries, scopes, expiry, and disclosure budget. Revocation takes effect on the next tool call.

## Disclosure and writes

Retrieval results are filtered first by CERVEL permissions and granted libraries, then by per-request fragment, byte, and sensitive-fragment limits. Every tool call produces an access receipt with the request digest, decision, disclosed resource identifiers, counts, bytes, budget snapshot, client, principal, and timestamp.

External tools cannot mutate the Vault. `cervel_propose_write` stores the exact arguments and digest. A CERVEL principal must approve the same digest through the review endpoint; any post-review change fails closed. Approved proposals remain separate from execution so verified-action policy can govern the eventual mutation.

## Audit and recovery

Client registration, device authorization, token issuance, tool access, proposals, approvals/rejections, execution, and revocation are append-only audit events. Grant revocation retains receipts and history rather than erasing accountability.
