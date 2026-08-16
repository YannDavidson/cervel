# Principle: provider errors should be normalized before product exposure

Raw third-party error bodies can contain unstable or sensitive details. The connector runtime emits stable CERVEL error categories for state/health while leaving richer provider diagnostics for a future protected observability layer.
