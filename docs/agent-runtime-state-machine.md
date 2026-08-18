# Agent state model

Agent identity: enabled → disabled blocks new runtime access.

Workspace grant: present with permissions → narrowed/removed changes authority immediately on next operation.

Observation: append-only durable memory in v0.1; may reference a promoted Claim.

Subscription: enabled with cursor → bounded pulls advance cursor; disabling stops consumption.

Delivery receipt: delivered → acknowledged. Receipts are audit state and do not grant additional authority.
