# Minimum viable agent contract

To integrate with CERVEL v0.1, an agent implementation needs only: a dedicated CERVEL principal; a Node/Workspace selected by the host application; an explicit grant; the ability to send/receive JSON over the Agent Runtime API; and a place to retain CERVEL IDs such as CCP, observation, subscription and delivery receipt identifiers.

The agent does not need to understand CERVEL's database schema or own a vector store.
