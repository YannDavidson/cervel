# Folder-watch follow-up

`remote_kind` and cursor/provider-state fields reserve room for folder/drive watches, but PR #7's execution path downloads one remote file per watch. Folder support should enumerate children through provider delta APIs and maintain one `source_documents` mapping per remote file under the watch.
