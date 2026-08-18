# Demo scenario

A research agent is granted one project Workspace. It requests a CCP about a market assumption, performs analysis, then stores an observation and promotes the strongest result into a Claim. The model session ends.

Later a connected source changes. Knowledge Evolution emits an Event, impact propagation marks the assumption as requiring review, and a Watch owned by the research-agent principal generates `why_now`. On its next signal pull, the agent receives that alert, requests a fresh CCP and re-evaluates the work.

The agent can be replaced by a different model between those two sessions; the memory, provenance and trigger remain in CERVEL.
