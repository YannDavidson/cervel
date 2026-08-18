# Agent integration notes

A provider adapter should map one authenticated external agent/service to one CERVEL service principal. Do not reuse an administrator principal for convenience.

Provision the minimum Workspace permissions needed. Read-only agents usually need `memory:read`, `context:read`, and `events:read`; learning agents add `memory:write`; only agents whose assertions should enter shared semantic knowledge receive `claim:write`.

When using Watch-bound subscriptions, create the Watch under the same principal that owns the agent identity so principal-owned alerts remain private and consumable by that agent.
