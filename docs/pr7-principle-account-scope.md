# Principle: external accounts are scoped per Workspace connection

Even when the same Google/Dropbox/Microsoft account is authorized in multiple Workspaces, credentials and watch policy remain represented by separate CERVEL connection records so one Workspace cannot inherit another's connector authority.
