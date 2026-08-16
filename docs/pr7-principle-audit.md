# Principle: every background decision should be inspectable

Changed, unchanged, and failed checks all deserve durable sync-run records. Automation that silently does nothing is difficult to trust; CERVEL records enough state to explain what the maintenance loop observed and did.
