# Data flow

Provider authorization yields encrypted credentials. A watched source stores only the remote locator/policy. At sync time CERVEL downloads provider bytes, computes SHA-256, skips unchanged content, or persists a new immutable artifact through the existing CKO pipeline. Provider credentials never enter CKO content or artifact metadata.
