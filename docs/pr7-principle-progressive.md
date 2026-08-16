# Principle: provider rollout should be progressive

Connector configuration is lazy so one provider can be enabled and validated without requiring credentials for all providers. Missing provider configuration fails that provider closed while the rest of CERVEL remains operational.
