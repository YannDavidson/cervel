# Principle: authorization failure needs a distinct user action

A refresh-token failure cannot be repaired by ordinary background retry, so CERVEL marks the connection `reauth_required` and raises a critical health condition rather than treating it as a generic transient sync error.
