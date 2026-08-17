# Design principles

1. Read upstream, own downstream.
2. Provider IDs locate; CKO/CKURI identify.
3. Content hash decides change.
4. Revisions append; they do not overwrite evidence.
5. Automation is scoped by persisted policy, not caller-selected tenant IDs.
6. Freshness is knowledge quality data.
7. Provider-specific code stops at bytes/metadata; CERVEL logic stays provider-neutral.
