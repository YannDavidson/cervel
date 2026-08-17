# Principle: folder synchronization needs enumeration semantics

A folder is not one document. PR #7 reserves folder/drive watch kinds but keeps execution file-oriented until provider delta enumeration can maintain separate remote-file-to-CKO mappings correctly.
