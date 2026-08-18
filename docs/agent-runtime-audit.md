# Agent Runtime audit contract

Every durable observation names the agent identity, Node, Workspace, subject, confidence, and creation time. Claims additionally retain the creator principal and agent/workspace qualifiers. Signal delivery is recorded per subscription, event/alert, delivery time, and acknowledgement time.

The runtime therefore supports reconstructing who asserted what, under which Workspace grant, what context/signals were available, and which proactive signals were surfaced.
