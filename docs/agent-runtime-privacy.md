# Agent Runtime privacy posture

Agent identity does not broaden data visibility. The runtime requires the same CERVEL principal and Workspace boundaries used by the rest of the knowledge system, with an additional explicit agent grant.

Observation memory is Workspace scoped and is not returned across grants. CCP retrieval continues through the existing permission-aware assembler. Watch alerts remain principal-owned. Provider metadata is not used to select or expose knowledge.

Future telemetry should prefer identifiers/counts over raw observation, Claim, CCP or alert content.
