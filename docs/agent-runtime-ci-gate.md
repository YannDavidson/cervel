# CI gate summary

The new lane is expected to fail loudly if migration 021 is invalid, TypeScript contracts drift, the existing test suite regresses, bootstrap no longer works, agent tables are missing, Claim provenance is lost, or the same agent principal can enter an ungranted Workspace.

Legacy workflows remain part of the gate because Agent Runtime imports CCP and references Claims, Knowledge Events and Watch tables created by earlier milestones.
