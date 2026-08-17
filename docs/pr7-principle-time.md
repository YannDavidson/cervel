# Principle: checked, successful, changed, and remotely modified are different times

PR #7 persists distinct timestamps for attempted check, successful sync, observed content change, and provider modification. Collapsing these would make freshness and diagnostics ambiguous.
