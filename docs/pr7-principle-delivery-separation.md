# Principle: health detection and notification delivery are separate systems

Connector synchronization creates durable health conditions. Email/SMS/Slack/push delivery should consume those conditions later, avoiding provider-specific messaging logic inside the sync engine.
