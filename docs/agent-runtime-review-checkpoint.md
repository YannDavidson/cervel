# Review checkpoint

At first CI green, do not merge immediately. Re-read the final runtime SQL against the invariants, especially the union of raw Events and Watch alerts, subscription ownership, receipt uniqueness, observation-to-Claim provenance, and administrative grant creation.

If a boundary defect is found, patch it and require the complete integration matrix again on the new head.
