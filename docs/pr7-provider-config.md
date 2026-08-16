# Provider configuration failure

Provider configuration is lazy: CERVEL can boot without every connector configured. Attempting to start/use a provider whose required client configuration is absent fails with a configuration-required service error, allowing progressive provider rollout.
