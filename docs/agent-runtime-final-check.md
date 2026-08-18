# Final check

Before merging, verify that documentation and implementation agree on one important nuance: `watch:read` is part of the permission vocabulary, but v0.1 signal polling is fundamentally gated by `events:read` and principal ownership of Watch alerts. If stricter separate Watch gating is desired, enforce it in code before release rather than documenting a stronger guarantee than the runtime provides.
