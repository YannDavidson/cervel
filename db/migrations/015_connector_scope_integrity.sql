BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS source_connections_scope_identity_idx ON source_connections(id,node_id,workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS libraries_scope_identity_idx ON libraries(id,node_id,workspace_id);
ALTER TABLE watched_sources
  ADD CONSTRAINT watched_sources_connection_scope_fk FOREIGN KEY(connection_id,node_id,workspace_id) REFERENCES source_connections(id,node_id,workspace_id) ON DELETE CASCADE,
  ADD CONSTRAINT watched_sources_library_scope_fk FOREIGN KEY(library_id,node_id,workspace_id) REFERENCES libraries(id,node_id,workspace_id) ON DELETE SET NULL;
COMMIT;
