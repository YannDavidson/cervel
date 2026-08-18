# Agent Runtime compatibility contract

The Agent Knowledge Runtime is provider-neutral by design. Integration code for a model or agent framework should perform authentication/credential verification outside the core, resolve that caller to a CERVEL principal, then call the agent runtime with the desired Node + Workspace.

Compatible callers include hosted model agents, local models, coding agents, workflow agents, business-function agents, CERVEL-native agents and deterministic automation services. The core never branches authorization logic on provider, model name or orchestration framework.

This is what lets CERVEL become long-lived memory while agent implementations remain replaceable.
