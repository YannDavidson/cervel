# Agent Runtime guardrails

Agent permissions are additive only when explicitly granted. No capability implies another capability. A memory writer is not a Watch reader; an event reader is not a claim writer; an agent assertion is not verification; and Node membership alone is not Workspace authorization.

These separations are intentional boundaries for future autonomous systems.
