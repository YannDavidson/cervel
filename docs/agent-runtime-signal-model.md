# Agent signal model

Subscriptions are bounded pull cursors over the existing Knowledge Event and Watch surfaces. They may filter by event type, downstream impact kind, and minimum event confidence.

Each surfaced event or alert receives a durable delivery receipt. Acknowledgement is idempotent. This v0.1 runtime deliberately avoids an autonomous unbounded daemon; webhook, queue, MCP/A2A, and push transports can be layered over the same subscription contract later.
