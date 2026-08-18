# PR #12 checklist

Architecture: provider-neutral; reuses principals/Workspaces/Claims/CCP/Events/Watch; no agent-only knowledge silo.

Security: explicit grant per Workspace; granular permissions; principal-owned Watch alerts; UUID possession is not authority.

Durability: observations, Claims, subscriptions and receipts persisted.

Noise/cost: no background daemon; bounded signal pull; existing Watch scoring/cooldown reused.

Release: full legacy matrix + dedicated real-DB lane on final head; final diff review; Ready for Review; expected-head squash merge.
