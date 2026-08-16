# Provider separation

Each provider has independent OAuth configuration and can fail closed without affecting the other connectors. The shared synchronization engine starts only after provider-specific authorization/account/download steps succeed.
