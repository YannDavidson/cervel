# PR #12 release plan

1. Open as Draft against `main`.
2. Execute every existing CERVEL integration workflow because API/migrations changed.
3. Require Agent Knowledge Runtime Integration to prove real durable write + Claim provenance + Workspace denial.
4. Inspect any failing lane and fix the underlying implementation, never weaken the validator to obtain green.
5. Re-run all lanes on the exact final head after any patch.
6. Review final diff for tenant leakage, privilege escalation, provenance loss, duplicate/unbounded signal delivery and provider coupling.
7. Mark Ready for Review only when the release gate is satisfied.
8. Squash merge with expected-head protection.
