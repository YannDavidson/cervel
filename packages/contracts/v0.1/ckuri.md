# CKURI v0.1

Canonical:
`cervel://{node-authority}/cko/{uuidv7}`

Stable fragments:
`cervel://{node-authority}/cko/{uuidv7}#frag/{fragment_uuidv7}`

Claims:
`cervel://{node-authority}/cko/{uuidv7}#claim/{claim_uuidv7}`

Human aliases may use:
`cervel://{node-authority}/{alias/path}`

Rules:
- Canonical CKO IDs are immutable.
- Aliases are Node-scoped and mutable.
- Canonical CKURIs are never reassigned.
- Resolver authorization MUST execute before any content representation is returned.
- Storage URLs are never CKURIs.
