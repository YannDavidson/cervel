# Principle: never rewrite an applied migration

Connector OAuth needs a new auth-challenge kind, so PR #7 adds migration 013 rather than modifying migration 011. Existing installations and clean installations therefore converge through the same ordered migration history.
