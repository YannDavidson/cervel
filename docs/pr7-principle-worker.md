# Principle: background work should have a direct job entrypoint

The standalone source-sync worker lets infrastructure schedule synchronization without exposing an HTTP route. The protected internal route remains available for environments where an HTTP scheduler is operationally simpler.
