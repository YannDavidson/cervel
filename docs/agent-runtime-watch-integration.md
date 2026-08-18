# Agent + Watch integration

Raw Knowledge Event access and proactive Watch access are deliberately distinct. `events:read` lets an agent consume eligible Workspace events. `watch:read` additionally lets it consume Watch alerts owned by the same agent principal and scoped to the same Node + Workspace.

This prevents an event-reading service from automatically inheriting a human or another agent's personalized Watch intelligence.
