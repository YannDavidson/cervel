# Compatibility

PR #12 is additive. Existing human Workspace, connector, retrieval, reasoning, Knowledge Evolution, Impact, and Watch APIs remain the source primitives. The agent layer reuses those contracts and adds migration 021 plus new `/v1/agent*` routes.

No existing knowledge object, claim, CCP, event, impact, or Watch schema is rewritten by this rollout.
