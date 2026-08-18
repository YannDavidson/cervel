# Final gate reminder

Do not merge PR #12 based on schema/API inspection alone. The final head must compile, migrate from zero, pass the existing test suite, pass all legacy integration workflows, and pass a real Postgres behavior test demonstrating both a successful agent memory+Claim write and a denied cross-Workspace access.

After CI is green, perform one final diff inspection focused on authorization joins and signal ownership before changing Draft state.
