# Agent Runtime sequence

1. Create or resolve a CERVEL agent/application/service principal.
2. Register its agent identity.
3. Grant least-privilege capabilities for one Workspace.
4. Agent writes an observation and optional claim.
5. Agent requests a CCP for the current task.
6. Knowledge Evolution emits an Event and Impact propagation describes downstream effects.
7. Watch evaluates relevance and may surface an alert.
8. Agent subscription polls eligible Event/Watch signals.
9. CERVEL persists delivery receipts.
10. Agent acknowledges processed delivery.
