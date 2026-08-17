# Principle: merge readiness and production readiness are distinct

A connector PR can be code-safe and mergeable without storing live OAuth credentials in CI. Production readiness additionally requires external provider configuration and live smoke validation in the deployment environment.
