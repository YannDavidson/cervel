# Agent runtime threat model

Primary risks are cross-Workspace memory leakage, forged agent identity, over-broad grants, agent assertions being mistaken for verified knowledge, Watch leakage, replay duplication, and writes targeting foreign resources.

Mitigations in v0.1: Node-bound principal identity, composite agent/Node foreign keys, explicit Workspace grants, fixed permission vocabulary, subject-scope validation, `claimed` default epistemic status with provenance, separate `watch:read`, Node + Workspace signal predicates, bounded polling, and durable delivery receipts.
