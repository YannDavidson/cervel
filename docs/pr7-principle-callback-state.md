# Principle: OAuth callback scope comes from consumed server state

The connector callback receives only provider code/state. Node, Workspace, Principal, and provider binding are recovered from the atomically consumed CERVEL auth challenge rather than trusted from browser-supplied tenant fields.
