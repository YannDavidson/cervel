# CERVEL-native agents

Internal CERVEL agents should use exactly the same Agent Knowledge Runtime contract as external agents. They may use in-process calls later for efficiency, but authorization must still resolve the same principal, Node, Workspace and permission set.

This prevents “internal” from becoming a privileged backdoor and makes behavior portable between CERVEL-native, local and third-party agent runtimes.
