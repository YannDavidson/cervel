# CERVEL Watch / Proactive Intelligence

PR #11 adds a proactive intelligence layer over Knowledge Evolution and Knowledge Impact.

Users describe what matters to them as a Watch. A Watch is scoped to one Node, one Workspace, and one owning principal. It can contain a natural-language intent plus optional event types, subject types, impact kinds, keywords, focused resource IDs/types/CKOs, minimum confidence thresholds, an importance threshold, cooldown, and delivery channels.

## Runtime flow

`Knowledge Event → Impact Paths → Watch Candidate → Relevance + Importance Score → Match → Cooldown → Alert`

Evolution-generated events are evaluated automatically after dependency impact propagation. Existing or externally inserted events can be evaluated through `/v1/watch/evaluate/:eventId` or backfilled through `/v1/watch/reevaluate`.

## Scoring

The first scoring contract is deliberately explainable and bounded:

- 30% event confidence
- 35% strongest eligible downstream impact confidence
- 15% natural-language/keyword relevance
- 20% explicit focus match

Every score is clamped to `[0,1]`. A Watch only surfaces when the score reaches its `min_score`. `requires_review`, `invalidated`, and high aggregate scores raise alert severity.

Natural-language intent is converted into bounded relevance terms when explicit keywords are not supplied. Explicit resource focus is a hard gate rather than a soft relevance hint.

## Why now

Every durable match stores an explanation snapshot containing the Watch intent, event type, event confidence, downstream impact confidence, relevance terms, keyword score, focus score, and the exact matching impact resources/path metadata. Alerts retain this as `why_now` so the UI can explain why CERVEL surfaced the notification.

## Noise control

A per-Watch cooldown suppresses repeated alerts for the same event subject while still recording the match. The default cooldown is one hour. Re-evaluation is idempotent per Watch + Event and cannot create duplicate alerts.

## Tenant and ownership boundaries

Watches, matches, and alerts are all Node + Workspace scoped. Alerts are additionally principal-owned. Evaluation only loads Watches from the event's exact Node + Workspace, so an event in Workspace B cannot activate a Watch from Workspace A. Inbox queries are restricted to the owning principal.

## API

- `POST /v1/watch` create a Watch.
- `GET /v1/watch` list the current principal's Watches.
- `PATCH /v1/watch/:id` update/pause a Watch.
- `POST /v1/watch/evaluate/:eventId` evaluate one existing event.
- `POST /v1/watch/reevaluate` backfill recent events.
- `GET /v1/watch/inbox` read proactive alerts.
- `PATCH /v1/watch/inbox/:id` mark an alert unread, read, or dismissed.

## Scope of v0.1

`inbox` is the implemented durable delivery surface. The schema carries `channels` so later PRs can add email, Slack, mobile push, webhook, or agent-to-agent delivery without changing the Watch contract. This PR does not introduce a background polling daemon; it evaluates events synchronously when CERVEL creates them and provides bounded explicit backfill for other event producers.

## Release gate

Keep the PR draft until the existing ten integration lanes plus the CERVEL Watch Proactive lane pass on the final head. The Watch lane must prove: schema migration, a real proactive alert from a Knowledge Event + downstream impact, explainable why-now data, Workspace isolation, cooldown suppression, durable inbox behavior, build, and unit tests.
