# PR #12 release gate

Keep this PR draft until the final head passes every existing integration lane plus Agent Knowledge Runtime Integration.

The new lane must prove:

1. An agent is a CERVEL principal bound to an explicit agent identity.
2. Node membership alone cannot cross a Workspace boundary.
3. Workspace permissions separately gate memory read/write, Claim writes, CCP consumption, and signal reads.
4. An agent observation persists durably and an optional Claim preserves agent + Workspace provenance.
5. Agent CCP consumption uses the existing permission-aware Context Package assembler rather than a privileged retrieval bypass.
6. Agent signal subscriptions are exact Node + Workspace scoped and can consume Knowledge Events and principal-owned Watch alerts.
7. Signal delivery is cursor-based, idempotent, auditable through receipts, and acknowledgement-capable.
8. Build, tests, migrations, and all legacy integration lanes remain green.

Before Ready for Review, inspect the final diff for privilege escalation, cross-tenant joins, unbounded polling, duplicate delivery, provenance loss, and accidental provider-specific coupling.
