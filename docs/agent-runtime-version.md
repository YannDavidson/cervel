# Agent Knowledge Runtime version contract

Version: `v0.1`

The v0.1 contract stabilizes these nouns: **Agent Identity, Workspace Grant, Agent Observation, Agent Subscription, Delivery Receipt**.

The stable behavioral promise is that agent access is mediated by CERVEL principals and explicit Workspace capabilities, CCP consumption uses the existing retrieval path, durable writes preserve agent provenance, and proactive signals reuse Knowledge Events / CERVEL Watch.

Transport and authentication mechanisms above the principal boundary are not yet stable API. They can evolve without changing durable CERVEL knowledge objects or the permission model introduced here.
