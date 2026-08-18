# Agent Runtime security checklist

Before merging PR #12 verify that no agent-facing query can omit Workspace scope; administrative provisioning requires an existing Node principal; an agent cannot self-grant permissions; Claim writes require both observation-write and Claim capability; CCP assembly executes as the agent principal; Watch alerts are filtered to that principal; subscriptions cannot reference another agent; signal limits are bounded; delivery uniqueness prevents durable duplicates; and disabling an agent makes `loadAgentScope` fail.

Provider/API credential design is explicitly outside this checklist because v0.1 begins after authentication has resolved to a CERVEL principal.
