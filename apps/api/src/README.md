# CERVEL API v0.1

Minimum endpoints:

- POST /v1/objects
- GET /v1/objects/:id
- PATCH /v1/objects/:id
- DELETE /v1/objects/:id
- POST /v1/objects/:id/artifacts
- GET /v1/objects/:id/fragments
- GET /v1/objects/:id/claims
- GET /v1/objects/:id/relationships
- GET /v1/objects/:id/provenance
- POST /v1/libraries
- POST /v1/libraries/:id/objects/:cko_id
- GET /v1/search
- POST /v1/context
- GET /v1/context/:id
- GET /v1/resolve?uri=...
- GET /v1/trace/:resource_type/:resource_id

Implementation requirement:
authorization scope is resolved before any retrieval query.
