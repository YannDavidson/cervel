# Agent Knowledge Runtime architecture

The runtime sits above the existing CERVEL knowledge primitives and below model/provider adapters.

```text
OpenAI / Anthropic / Gemini / Local / Internal Agents
                         |
                 Agent adapter/auth
                         |
              Agent Knowledge Runtime
        identity | grants | memory | signals
             /          |          \
           CCP        Claims      Events/Watch
            |            |             |
       Retrieval      Knowledge      Impact
            \____________|_____________/
                     CERVEL
```

This layering keeps model churn outside the durable knowledge core. A future MCP server, A2A gateway, coding-agent plugin, business-agent runtime, or CERVEL-native agent can all use the same authorization and provenance contract.
