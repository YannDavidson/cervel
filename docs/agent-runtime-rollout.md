# Rollout checklist

- [x] Branch from merged PR #11 `main`.
- [x] Add migration 021.
- [x] Add Agent Runtime core + HTTP routes.
- [x] Register runtime in API server.
- [x] Add real Postgres tenant/provenance validator.
- [x] Add dedicated integration workflow.
- [x] Document architecture/security/release invariants.
- [ ] Open Draft PR #12.
- [ ] Inspect full integration matrix on exact head.
- [ ] Fix any real failures and rerun all lanes.
- [ ] Final tenant/provenance/signal diff review.
- [ ] Ready for Review.
- [ ] Squash merge with expected-head protection.
