import type { PoolClient } from "pg";
import { addWatch } from "./connectors";
import { listProviderItems, providerDelta, loadConnection, type PickerItem, type DeltaItem } from "./source-provider";
import { syncWatchV2 } from "./source-sync-v2";
import { uuidv7 } from "./uuidv7";

type Session = Record<string, unknown>;

function scope(session: Session) {
  const nodeId = String(session.node_id);
  const workspaceId = session.workspace_id ? String(session.workspace_id) : "";
  const principalId = String(session.principal_id);
  if (!workspaceId) throw Object.assign(new Error("WORKSPACE_SESSION_SCOPE_REQUIRED"), { statusCode: 400 });
  return { nodeId, workspaceId, principalId };
}

async function cacheItem(client: PoolClient, connectionId: string, item: PickerItem) {
  await client.query(
    `INSERT INTO source_picker_cache(
       id,connection_id,remote_id,parent_remote_id,remote_kind,name,mime_type,remote_path,modified_at,version)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT(connection_id,remote_id) DO UPDATE SET
       parent_remote_id=EXCLUDED.parent_remote_id,remote_kind=EXCLUDED.remote_kind,name=EXCLUDED.name,
       mime_type=EXCLUDED.mime_type,remote_path=EXCLUDED.remote_path,modified_at=EXCLUDED.modified_at,
       version=EXCLUDED.version,observed_at=now()`,
    [uuidv7(), connectionId, item.remote_id, item.parent_remote_id ?? null, item.remote_kind, item.name,
      item.mime_type ?? null, item.remote_path ?? null, item.modified_at ?? null, item.version ?? null]
  );
}

export async function browseSourceV2(
  client: PoolClient,
  session: Session,
  connectionId: string,
  parent?: string | null,
  cursor?: string | null
) {
  const s = scope(session);
  const connection = await loadConnection(client, connectionId, s.nodeId, s.workspaceId);
  const page = await listProviderItems(client, connection, parent, cursor);
  for (const item of page.items) await cacheItem(client, connectionId, item);
  return page;
}

async function walk(
  client: PoolClient,
  connectionId: string,
  session: Session,
  parent: string,
  depth: number,
  out: PickerItem[]
) {
  if (depth > 20) return;
  let cursor: string | null = null;
  do {
    const page = await browseSourceV2(client, session, connectionId, parent, cursor);
    cursor = page.cursor;
    for (const item of page.items) {
      out.push(item);
      if (item.remote_kind === "folder") await walk(client, connectionId, session, item.remote_id, depth + 1, out);
    }
  } while (cursor);
}

export async function createSourceWatchV2(
  client: PoolClient,
  session: Session,
  input: {
    connectionId: string;
    remoteId: string;
    name: string;
    remoteKind: "file" | "folder";
    libraryId?: string | null;
    intervalMinutes?: number;
    recursive?: boolean;
  }
) {
  const watch = await addWatch(client, session, {
    connectionId: input.connectionId,
    remoteId: input.remoteId,
    name: input.name,
    remoteKind: input.remoteKind,
    libraryId: input.libraryId,
    intervalMinutes: input.intervalMinutes ?? 60
  });
  await client.query(
    `UPDATE watched_sources SET recursive=$2,delta_mode=CASE WHEN $3='folder' THEN 'delta' ELSE delta_mode END WHERE id=$1`,
    [watch.id, Boolean(input.recursive), input.remoteKind]
  );

  if (input.remoteKind === "folder" && input.recursive) {
    const items: PickerItem[] = [];
    await walk(client, input.connectionId, session, input.remoteId, 0, items);
    for (const item of items.filter((value) => value.remote_kind === "file")) {
      const child = await addWatch(client, session, {
        connectionId: input.connectionId,
        remoteId: item.remote_id,
        name: item.name,
        remoteKind: "file",
        mimeType: item.mime_type ?? undefined,
        libraryId: input.libraryId,
        intervalMinutes: input.intervalMinutes ?? 60
      });
      await client.query(
        `UPDATE watched_sources SET parent_remote_id=$2,delta_mode='delta',metadata=metadata||$3::jsonb WHERE id=$1`,
        [child.id, input.remoteId, JSON.stringify({ managed_by_folder_watch: watch.id, remote_path: item.remote_path ?? null })]
      );
    }
  }
  return (await client.query(`SELECT * FROM watched_sources WHERE id=$1`, [watch.id])).rows[0];
}

async function normalizeDeltaItem(client: PoolClient, connectionId: string, item: DeltaItem): Promise<DeltaItem> {
  if (!item.deleted || !item.remote_path) return item;
  const cached = await client.query(
    `SELECT remote_id,parent_remote_id FROM source_picker_cache
     WHERE connection_id=$1 AND lower(remote_path)=lower($2) ORDER BY observed_at DESC LIMIT 1`,
    [connectionId, item.remote_path]
  );
  if (cached.rowCount !== 1) return item;
  return { ...item, remote_id: cached.rows[0].remote_id, parent_remote_id: cached.rows[0].parent_remote_id ?? item.parent_remote_id ?? null };
}

async function belongsToWatch(client: PoolClient, connectionId: string, watch: any, item: DeltaItem) {
  if (watch.remote_id === item.remote_id) return true;
  if (!watch.recursive || watch.remote_kind !== "folder") return false;

  const ancestry = await client.query(
    `WITH RECURSIVE ancestors AS (
       SELECT remote_id,parent_remote_id FROM source_picker_cache WHERE connection_id=$1 AND remote_id=$2
       UNION ALL
       SELECT parent.remote_id,parent.parent_remote_id
       FROM source_picker_cache parent JOIN ancestors child ON child.parent_remote_id=parent.remote_id
       WHERE parent.connection_id=$1
     )
     SELECT 1 FROM ancestors WHERE remote_id=$3 LIMIT 1`,
    [connectionId, item.remote_id, watch.remote_id]
  );
  if (ancestry.rowCount === 1) return true;

  if (item.remote_path) {
    const root = await client.query(
      `SELECT remote_path FROM source_picker_cache WHERE connection_id=$1 AND remote_id=$2 LIMIT 1`,
      [connectionId, watch.remote_id]
    );
    const rootPath = root.rows[0]?.remote_path as string | null | undefined;
    if (rootPath) {
      const normalizedRoot = rootPath.replace(/\/+$/, "").toLowerCase();
      const normalizedItem = item.remote_path.toLowerCase();
      return normalizedItem === normalizedRoot || normalizedItem.startsWith(`${normalizedRoot}/`);
    }
  }
  return false;
}

export async function syncConnectionDeltaV2(
  client: PoolClient,
  connectionId: string,
  nodeId?: string,
  workspaceId?: string
) {
  const connection = await loadConnection(client, connectionId, nodeId, workspaceId);
  let cursor = connection.delta_cursor ?? null;
  let total = 0;
  let more = true;

  while (more && total < 1000) {
    const page = await providerDelta(client, connection, cursor);
    cursor = page.cursor;
    more = page.has_more;

    const items: DeltaItem[] = [];
    for (const raw of page.items) {
      const item = await normalizeDeltaItem(client, connectionId, raw);
      await cacheItem(client, connectionId, item);
      items.push(item);
    }

    const candidateWatches = await client.query(
      `SELECT * FROM watched_sources WHERE connection_id=$1 AND sync_enabled=true`,
      [connectionId]
    );

    for (const item of items) {
      for (const watch of candidateWatches.rows) {
        if (!(await belongsToWatch(client, connectionId, watch, item))) continue;

        await client.query(
          `INSERT INTO source_delta_events(id,connection_id,watched_source_id,provider,remote_id,event_type,provider_cursor,payload)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
          [uuidv7(), connectionId, watch.id, connection.provider, item.remote_id,
            item.deleted ? "deleted" : "updated", cursor, JSON.stringify(item)]
        );

        if (item.deleted) {
          await client.query(
            `UPDATE source_documents SET deleted_at=now(),is_current=false WHERE watched_source_id=$1 AND remote_id=$2`,
            [watch.id, item.remote_id]
          );
          continue;
        }
        if (item.remote_kind !== "file") continue;

        let target = watch;
        if (watch.remote_kind !== "file" || watch.remote_id !== item.remote_id) {
          const childSession = { node_id: watch.node_id, workspace_id: watch.workspace_id, principal_id: watch.principal_id };
          target = await addWatch(client, childSession, {
            connectionId,
            remoteId: item.remote_id,
            name: item.name,
            remoteKind: "file",
            mimeType: item.mime_type ?? undefined,
            libraryId: watch.library_id,
            intervalMinutes: watch.sync_interval_minutes
          });
          await client.query(
            `UPDATE watched_sources SET parent_remote_id=$2,delta_mode='delta',metadata=metadata||$3::jsonb WHERE id=$1`,
            [target.id, watch.remote_id, JSON.stringify({ managed_by_folder_watch: watch.id, remote_path: item.remote_path ?? null })]
          );
        }
        await syncWatchV2(client, target.id);
      }
      total++;
    }
  }

  await client.query(
    `UPDATE source_connections SET delta_cursor=$2,delta_cursor_updated_at=now(),updated_at=now() WHERE id=$1`,
    [connectionId, cursor]
  );
  await client.query(
    `UPDATE source_delta_events SET processed_at=now() WHERE connection_id=$1 AND processed_at IS NULL`,
    [connectionId]
  );
  return { processed: total, cursor, has_more: more };
}
