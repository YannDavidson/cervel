# Principle: recurring health conditions should deduplicate

A scheduler may observe the same stale/error condition repeatedly. Knowledge Health uses a Workspace/source condition key so repeated observations refresh one actionable signal rather than creating notification spam.
