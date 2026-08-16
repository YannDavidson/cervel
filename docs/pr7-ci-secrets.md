# CI secret posture

The connector integration workflow uses only synthetic CERVEL encryption/scheduler values. It does not require Google, Dropbox, or Microsoft client secrets and does not make live provider calls. This keeps external OAuth credentials out of pull-request CI.
