# Agent Runtime performance posture

PR #12 keeps runtime work bounded. Agent observation writes are single-row plus optional Claim writes. CCP cost remains governed by existing Context Package limits. Signal polling caps results at 100 and uses indexed Node/Workspace/time filters. Subscriptions store a durable cursor rather than rescanning all history on every request.

No resident agent worker, polling daemon, queue consumer or model invocation is introduced, so idle Agent Runtime has no autonomous compute cost in v0.1.
