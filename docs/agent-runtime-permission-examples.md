# Permission examples

A summarization agent can receive `memory:read` + `context:read` only.

A research agent that learns can add `memory:write`; add `claim:write` only when its validated findings should enter shared CERVEL knowledge.

A monitoring agent can receive `events:read` and subscribe to raw Events. A relevance-focused monitoring agent can use a Watch owned by its principal; future enforcement can require `watch:read` for Watch-bound subscription management.

No example requires administrator credentials at runtime.
