# CERVEL Semantic Kernel v1.0

The kernel is the versioned semantic interchange layer beneath every CERVEL corpus. It does not replace existing CKO, entity, claim, relationship, provenance, policy, CKEP, or compilation tables. A kernel record binds those implementations to one stable contract.

Core primitives: CKO, Entity, Claim, Relationship, Event, State, Memory, Provenance, Authority, and Permission. Every record also carries lifecycle, sensitivity, confidence, temporal validity, policy, provenance, supersession, and immutable version history.

Canonical kernel identifiers use `cervel://{authority}/kernel/{kind}/{uuidv7}`. Canonical identifiers are immutable and never reassigned. Semantic views and future corpora reference these records instead of duplicating source artifacts.

Compatibility rules:

- Existing domain rows remain authoritative during the v1 transition.
- `semantic_kernel_bindings` links one kernel record to a legacy resource.
- Supersession creates a new record and preserves the previous version.
- Tombstones preserve identity and audit history while removing active representation.
- Permission evaluation remains deny-by-default.
