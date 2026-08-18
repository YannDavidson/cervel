# Agent revocation

Setting an agent identity `enabled=false` immediately causes runtime scope resolution to fail. Removing or reducing a Workspace grant removes the corresponding capability on the next call. Disabling a subscription stops signal polling for that subscription.

Historical observations, claims, and delivery receipts remain durable for provenance and audit unless separately governed by retention policy.
