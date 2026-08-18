# Agent Knowledge Runtime examples

## Research agent

Grant `memory:read`, `memory:write`, `claim:write`, `context:read`, and `events:read` in a research Workspace. The agent asks CERVEL for a CCP before a task, writes observations as it discovers durable facts, promotes high-confidence observations into Claims, then polls Knowledge Events to learn when upstream sources change.

## Internal decision agent

Grant `context:read`, `events:read`, and `watch:read` but omit write permissions. Bind its subscription to a Watch such as “alert me when evidence supporting the pricing decision becomes stale.” The agent receives the same explainable `why_now` impact evidence humans see without gaining permission to mutate memory.

## External specialist

Represent the provider-hosted agent as a service principal and external `agent_identity`. Grant access only to the project Workspace it needs. Provider identity never determines authorization; revoking the Workspace grant immediately removes CERVEL runtime access while preserving historical observations and delivery provenance.
