# Autonomy boundary

Agent Knowledge Runtime is memory/context infrastructure, not permission for autonomous external action. `claim:write` allows an agent to add semantic knowledge; it does not authorize sending messages, spending money, deploying code, changing source systems, or invoking arbitrary tools.

Those actions should later receive separate capability families, policy checks and where appropriate human approval. Keeping knowledge permissions distinct from action permissions is a foundational safety boundary for CERVEL-native agents.
