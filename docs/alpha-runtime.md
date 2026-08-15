# CERVEL Node Alpha — Core Runtime

PR #1 proves the first operational CERVEL loop:

`database bootstrap -> CKO creation -> artifact storage -> stable fragments -> CKURI resolution -> provenance`

## Local run

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:bootstrap
npm run dev:api
```

`db:bootstrap` prints the UUIDs required for API calls:

- nodeId
- workspaceId
- principalId
- storageLocationId
- authority

Pass `principalId` as the `X-CERVEL-PRINCIPAL-ID` header.

## Create a CKO

```bash
curl -X POST http://localhost:8787/v1/objects \
  -H 'content-type: application/json' \
  -H 'x-cervel-principal-id: <principalId>' \
  -d '{
    "node_id":"<nodeId>",
    "workspace_id":"<workspaceId>",
    "type":"note",
    "title":"CERVEL Alpha Note",
    "languages":["en"]
  }'
```

The response includes the canonical `cervel://{authority}/cko/{uuidv7}` URI.

## Upload and ingest a text artifact

The Alpha artifact endpoint accepts base64 payloads and stores the original bytes in the configured S3-compatible Vault. Text/Markdown/JSON are immediately split into paragraph-based stable fragments.

```bash
curl -X POST http://localhost:8787/v1/objects/<ckoId>/artifacts \
  -H 'content-type: application/json' \
  -H 'x-cervel-principal-id: <principalId>' \
  -d '{
    "storage_location_id":"<storageLocationId>",
    "filename":"note.md",
    "mime_type":"text/markdown",
    "content_base64":"IyBDRVJWRUxcblxuS25vd2xlZGdlIGhhcyBpZGVudGl0eS4="
  }'
```

## Resolve a CKURI

```bash
curl --get http://localhost:8787/v1/resolve \
  --data-urlencode 'uri=cervel://local/cko/<ckoId>' \
  -H 'x-cervel-principal-id: <principalId>'
```

## Provenance

```bash
curl http://localhost:8787/v1/objects/<ckoId>/provenance \
  -H 'x-cervel-principal-id: <principalId>'
```

## Alpha security boundary

PR #1 enforces Node membership before object, fragment, resolver, or provenance reads. Fine-grained RBAC/ABAC and AI permissions remain in the v0.1 contracts and will be activated in the retrieval runtime PR.

## Deliberately deferred to PR #2

- embeddings
- lexical/semantic hybrid search
- claim extraction
- graph expansion
- permission policy evaluator beyond Node membership
- CCP assembly
- model adapter execution
- cited answer generation
- Trace UI

## Known Alpha operational debt

Object storage is written during the artifact database transaction. A database failure after a successful S3 write can leave an orphaned blob. A compensating cleanup job or staged artifact state should be added before production hardening.
