# Agent memory model

CERVEL separates **observation memory** from **knowledge assertions**.

An observation records what an agent noticed, inferred during work, or wants available later. It is scoped to the agent's Node + Workspace and carries confidence/details.

A Claim is stronger: it enters CERVEL's shared semantic graph and may participate in reasoning, conflicts, temporal evolution and downstream impact. Therefore Claim creation requires its own permission and records the originating agent/Workspace in qualifiers.

This separation avoids turning every transient agent thought into shared truth while still giving agents durable memory between sessions.
