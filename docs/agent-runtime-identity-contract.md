# Agent identity contract

An agent identity is anchored to an existing CERVEL principal of type `agent`, `application`, or `service`. The identity adds runtime metadata such as internal/external kind, provider, external key, capabilities, and enabled state; it does not replace the principal security boundary.

One principal maps to at most one agent identity per Node in v0.1.
