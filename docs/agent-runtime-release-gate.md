# PR #12 release gate

Keep PR #12 draft until the existing integration matrix plus Agent Knowledge Runtime executes on the exact final head.

The Agent lane must prove:

1. agent principal + identity + Workspace grant resolve correctly;
2. cross-Workspace access is denied;
3. an agent cannot write an observation against a foreign or nonexistent subject;
4. durable observation can create a `claimed` claim with agent/workspace provenance;
5. the agent can consume a permission-scoped CCP;
6. a real Knowledge Event with downstream Impact can produce a Watch alert;
7. an authorized subscription receives both the Event and matching Watch signal;
8. Watch access fails closed without `watch:read`;
9. build, unit tests, and all migrations pass.

After green CI: inspect the final diff for privilege escalation, tenant leakage, cursor/replay behavior, and provenance integrity before Ready for Review and merge.
