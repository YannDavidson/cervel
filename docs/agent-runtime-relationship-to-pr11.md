# Relationship to PR #11

PR #11 made CERVEL proactive for a principal: Event → Impact → Watch → Alert. PR #12 exposes that intelligence fabric to authorized agents while preserving the same principal and Workspace boundaries.

The agent runtime does not duplicate Watch scoring. It consumes the durable Watch alert as a signal, alongside the underlying Knowledge Event, so agents can react to both raw change and personalized relevance.
