# Provenance acceptance tests

Required:
- captured artifact has SHA-256 and CAPTURED/IMPORTED event
- extracted fragment lineage points to source artifact
- AI-created persistent claim points to model_run + source fragment
- CCP creates USED_IN_CONTEXT provenance
- generated answer creates USED_IN_RESPONSE provenance
