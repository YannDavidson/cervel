# Principle: third-party secrets are deployment gates, not PR gates

CI should prove CERVEL-controlled schema/types/state/regressions without embedding provider credentials. Live OAuth behavior belongs to a configured deployment smoke gate after the code itself is merge-safe.
