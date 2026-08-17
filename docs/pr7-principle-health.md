# Principle: failures should become product state

A failed background refresh should not disappear into logs. PR #7 converts stale, failed, and authorization-expired conditions into durable Workspace Knowledge Health records that can drive user action and future notifications.
