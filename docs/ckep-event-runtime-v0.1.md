# CKEP Event Runtime v0.1

PR #15 turns the frozen CKEP v0.1 protocol into an operational event fabric.

## Journal

`ckep_event_journal` is append-only. Database triggers reject UPDATE and DELETE so an accepted event cannot be rewritten in place. Every row preserves the canonical CKEP envelope, event URI, stream sequence, previous event URI, idempotency key, integrity hash, publisher, and publication time.

A journal stream is scoped to one Node + Workspace. Sequence starts at 1 and is contiguous. Sequence 1 forbids `previous_event`; later entries must reference the immediately preceding event URI.

## Append and publish

`POST /v1/ckep/events` appends an already-formed CKEP envelope after full protocol validation, scope validation, idempotency checks, and stream-continuity validation.

`POST /v1/ckep/publish/:knowledgeEventId` bridges CERVEL's existing `knowledge_events` runtime into CKEP. The existing Knowledge Event and impacts are mapped with the PR #14 compatibility mapper and appended at the next stream sequence. Re-publishing the same Knowledge Event is retry-safe and returns the existing journal row.

## Query and replay

`GET /v1/ckep/events` supports bounded Workspace-scoped querying by event type, subject type, subject URI, and sequence cursor.

`GET /v1/ckep/replay` replays the immutable stream in ascending sequence order, optionally bounded by a sequence range.

## Subscriptions

A CKEP subscription belongs to one principal in one Node + Workspace. It can filter event types, subject types, subject URIs, and minimum confidence. Polling is bounded and advances an ordered `cursor_sequence` only after durable delivery receipts are inserted. Re-polling after a successful batch does not replay already delivered events.

## Runtime chain

`Knowledge Event → CKEP publish/append → immutable journal → query/replay → subscription → delivery receipt → acknowledgement`

## Invariants

- CKEP protocol validation is mandatory before append.
- Event URI, CKEP scope, Node, and Workspace must all agree.
- Journal rows are immutable at the database layer.
- Workspace stream sequence is contiguous.
- Previous-event continuity is exact.
- Idempotency is deterministic and retry-safe.
- Existing `knowledge_events` remain source-compatible through the PR #14 mapper.
- Query, replay, subscription and delivery are all Node + Workspace scoped.
