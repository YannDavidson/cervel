# PR #12 release plan

1. Open as draft from `agent/pr12-agent-knowledge-runtime` into `main`.
2. Execute the full integration matrix on the exact PR head.
3. Fix only real failures; do not weaken the behavioral gate.
4. Re-run after every runtime or migration fix.
5. Review the final diff for permissions, tenant isolation, provenance, Watch ownership, and cursor behavior.
6. Mark Ready for Review only when all lanes are green.
7. Merge with expected-head protection so the validated commit cannot move underneath the gate.
