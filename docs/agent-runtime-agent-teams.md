# Agent teams

v0.1 grants capabilities to one agent principal at a time. A later agent-team layer can compose multiple principals, but delegation should preserve the originating Workspace, capability subset, provenance chain, and revocation boundary.

PR #12 intentionally avoids implicit transitive delegation so one agent cannot mint authority for another.
