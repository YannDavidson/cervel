import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { boundedFetchBuffer } from "./bounded-stream";
import type { Provider } from "./connectors";

const MAX_SOURCE_BYTES = Number(process.env.CERVEL_CONNECTOR_MAX_BYTES ?? 25 * 1024 * 1024);

function key() {
  const raw = process.env.CERVEL_CONNECTOR_TOKEN_KEY;
  if (!raw) throw Object.assign(new Error("CERVEL_CONNECTOR_TOKEN_KEY_REQUIRED"), { statusCode: 503 });
  return createHash("sha256").update(raw).digest();
}
function open(value?: string | null) {
  if (!value) return null;
  const data = Buffer.from(value, "base64url");
  const iv = data.subarray(0, 12), tag = data.subarray(12, 28), body = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}
function seal(value?: string | null) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}
function env(provider: Provider, name: string) {
  const prefix = provider === "google_drive" ? "GOOGLE_DRIVE" : provider === "dropbox" ? "DROPBOX" : "ONEDRIVE";
  const value = process.env[`CERVEL_${prefix}_${name}`];
  if (!value) throw Object.assign(new Error(`CERVEL_${prefix}_${name}_REQUIRED`), { statusCode: 503 });
  return value;
}

export type SourceConnection = {
  id: string; node_id: string; workspace_id: string; principal_id: string; provider: Provider;
  access_token_ciphertext: string | null; refresh_token_ciphertext: string | null; token_expires_at: string | Date | null;
  delta_cursor?: string | null;
};

export async function loadConnection(client: PoolClient, connectionId: string, nodeId?: string, workspaceId?: string): Promise<SourceConnection> {
  const result = await client.query(
    `SELECT * FROM source_connections WHERE id=$1 AND ($2::uuid IS NULL OR node_id=$2) AND ($3::uuid IS NULL OR workspace_id=$3) AND status<>'disconnected'`,
    [connectionId, nodeId ?? null, workspaceId ?? null]
  );
  if (result.rowCount !== 1) throw Object.assign(new Error("SOURCE_CONNECTION_NOT_FOUND"), { statusCode: 404 });
  return result.rows[0] as SourceConnection;
}

export async function providerAccessToken(client: PoolClient, connection: SourceConnection) {
  let access = open(connection.access_token_ciphertext);
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : Number.POSITIVE_INFINITY;
  if (expiresAt < Date.now() + 60_000) {
    const refresh = open(connection.refresh_token_ciphertext);
    if (!refresh) throw Object.assign(new Error("CONNECTOR_REAUTH_REQUIRED"), { statusCode: 401 });
    const tokenUrl = connection.provider === "google_drive" ? "https://oauth2.googleapis.com/token" :
      connection.provider === "dropbox" ? "https://api.dropboxapi.com/oauth2/token" :
      "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const form = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh,
      client_id: env(connection.provider, "CLIENT_ID"), client_secret: env(connection.provider, "CLIENT_SECRET") });
    const response = await fetch(tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form });
    if (!response.ok) {
      await client.query(`UPDATE source_connections SET status='reauth_required',last_error='CONNECTOR_REAUTH_REQUIRED',updated_at=now() WHERE id=$1`, [connection.id]);
      throw Object.assign(new Error("CONNECTOR_REAUTH_REQUIRED"), { statusCode: 401 });
    }
    const token = await response.json() as any;
    access = token.access_token;
    if (!access) throw Object.assign(new Error("CONNECTOR_REAUTH_REQUIRED"), { statusCode: 401 });
    const tokenExpiresAt = token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000) : null;
    await client.query(
      `UPDATE source_connections SET access_token_ciphertext=$2,
       refresh_token_ciphertext=COALESCE($3,refresh_token_ciphertext),token_expires_at=$4,
       status='connected',last_error=NULL,updated_at=now() WHERE id=$1`,
      [connection.id, seal(access), seal(token.refresh_token), tokenExpiresAt]
    );
    connection.access_token_ciphertext = seal(access);
    if (token.refresh_token) connection.refresh_token_ciphertext = seal(token.refresh_token);
    connection.token_expires_at = tokenExpiresAt;
  }
  if (!access) throw Object.assign(new Error("CONNECTOR_REAUTH_REQUIRED"), { statusCode: 401 });
  return access;
}

export type PickerItem = {
  remote_id: string; parent_remote_id?: string | null; remote_kind: "file" | "folder" | "drive";
  name: string; mime_type?: string | null; remote_path?: string | null; modified_at?: string | null; version?: string | null;
};

export async function listProviderItems(client: PoolClient, connection: SourceConnection, parentId?: string | null, cursor?: string | null) {
  const access = await providerAccessToken(client, connection);
  if (connection.provider === "google_drive") {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("pageSize", "100"); url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,modifiedTime,version,parents,trashed)");
    url.searchParams.set("q", `'${parentId || "root"}' in parents and trashed=false`);
    if (cursor) url.searchParams.set("pageToken", cursor);
    const response = await fetch(url, { headers: { authorization: `Bearer ${access}` } });
    if (!response.ok) throw new Error("SOURCE_PICKER_FAILED");
    const data = await response.json() as any;
    return { items: (data.files ?? []).map((f:any):PickerItem => ({ remote_id:f.id,parent_remote_id:f.parents?.[0]??null,
      remote_kind:f.mimeType==="application/vnd.google-apps.folder"?"folder":"file",name:f.name,mime_type:f.mimeType,
      modified_at:f.modifiedTime??null,version:f.version?String(f.version):null })), cursor:data.nextPageToken??null };
  }
  if (connection.provider === "dropbox") {
    const endpoint = cursor ? "https://api.dropboxapi.com/2/files/list_folder/continue" : "https://api.dropboxapi.com/2/files/list_folder";
    const body = cursor ? { cursor } : { path: parentId || "", recursive:false, include_deleted:false, limit:100 };
    const response = await fetch(endpoint,{method:"POST",headers:{authorization:`Bearer ${access}`,"content-type":"application/json"},body:JSON.stringify(body)});
    if(!response.ok) throw new Error("SOURCE_PICKER_FAILED"); const data=await response.json() as any;
    return { items:(data.entries??[]).map((f:any):PickerItem=>({remote_id:f.id??f.path_lower,parent_remote_id:parentId??null,
      remote_kind:f[".tag"]==="folder"?"folder":"file",name:f.name,remote_path:f.path_display??f.path_lower,
      modified_at:f.server_modified??null,version:f.rev??null})), cursor:data.has_more?data.cursor:null };
  }
  const url = parentId ? `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(parentId)}/children?$top=100` : "https://graph.microsoft.com/v1.0/me/drive/root/children?$top=100";
  const response=await fetch(cursor||url,{headers:{authorization:`Bearer ${access}`}}); if(!response.ok)throw new Error("SOURCE_PICKER_FAILED");
  const data=await response.json() as any; return {items:(data.value??[]).map((f:any):PickerItem=>({remote_id:f.id,parent_remote_id:parentId??null,
    remote_kind:f.folder?"folder":"file",name:f.name,mime_type:f.file?.mimeType??null,remote_path:f.parentReference?.path?`${f.parentReference.path}/${f.name}`:f.name,
    modified_at:f.lastModifiedDateTime??null,version:f.eTag??f.cTag??null})),cursor:data["@odata.nextLink"]??null};
}

export type DeltaItem = PickerItem & { deleted?: boolean };
export async function providerDelta(client: PoolClient, connection: SourceConnection, cursor?: string | null) {
  const access=await providerAccessToken(client,connection);
  if(connection.provider==="google_drive"){
    let pageToken=cursor; if(!pageToken){const start=await fetch("https://www.googleapis.com/drive/v3/changes/startPageToken",{headers:{authorization:`Bearer ${access}`}});if(!start.ok)throw new Error("DELTA_CURSOR_FAILED");pageToken=String((await start.json() as any).startPageToken);return {items:[] as DeltaItem[],cursor:pageToken,has_more:false};}
    const url=new URL("https://www.googleapis.com/drive/v3/changes");url.searchParams.set("pageToken",pageToken);url.searchParams.set("pageSize","100");url.searchParams.set("fields","nextPageToken,newStartPageToken,changes(removed,fileId,file(id,name,mimeType,modifiedTime,version,parents,trashed))");
    const r=await fetch(url,{headers:{authorization:`Bearer ${access}`}});if(!r.ok)throw new Error("DELTA_FETCH_FAILED");const d=await r.json() as any;
    return {items:(d.changes??[]).map((x:any):DeltaItem=>({remote_id:x.fileId,parent_remote_id:x.file?.parents?.[0]??null,remote_kind:x.file?.mimeType==="application/vnd.google-apps.folder"?"folder":"file",name:x.file?.name??x.fileId,mime_type:x.file?.mimeType??null,modified_at:x.file?.modifiedTime??null,version:x.file?.version?String(x.file.version):null,deleted:Boolean(x.removed||x.file?.trashed)})),cursor:d.nextPageToken??d.newStartPageToken??pageToken,has_more:Boolean(d.nextPageToken)};
  }
  if(connection.provider==="dropbox"){
    const endpoint=cursor?"https://api.dropboxapi.com/2/files/list_folder/continue":"https://api.dropboxapi.com/2/files/list_folder";
    const body=cursor?{cursor}:{path:"",recursive:true,include_deleted:true,limit:100};const r=await fetch(endpoint,{method:"POST",headers:{authorization:`Bearer ${access}`,"content-type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw new Error("DELTA_FETCH_FAILED");const d=await r.json() as any;
    return {items:(d.entries??[]).map((f:any):DeltaItem=>({remote_id:f.id??f.path_lower,parent_remote_id:null,remote_kind:f[".tag"]==="folder"?"folder":"file",name:f.name??f.path_lower,remote_path:f.path_display??f.path_lower,modified_at:f.server_modified??null,version:f.rev??null,deleted:f[".tag"]==="deleted"})),cursor:d.cursor,has_more:Boolean(d.has_more)};
  }
  const url=cursor||"https://graph.microsoft.com/v1.0/me/drive/root/delta?$top=100";const r=await fetch(url,{headers:{authorization:`Bearer ${access}`}});if(!r.ok)throw new Error("DELTA_FETCH_FAILED");const d=await r.json() as any;
  return {items:(d.value??[]).map((f:any):DeltaItem=>({remote_id:f.id,parent_remote_id:f.parentReference?.id??null,remote_kind:f.folder?"folder":"file",name:f.name??f.id,mime_type:f.file?.mimeType??null,remote_path:f.parentReference?.path?`${f.parentReference.path}/${f.name}`:f.name,modified_at:f.lastModifiedDateTime??null,version:f.eTag??f.cTag??null,deleted:Boolean(f.deleted)})),cursor:d["@odata.nextLink"]??d["@odata.deltaLink"]??url,has_more:Boolean(d["@odata.nextLink"])};
}

export async function fetchProviderFileBounded(client:PoolClient,connection:SourceConnection,remoteId:string,mimeHint?:string|null){
  const access=await providerAccessToken(client,connection);let name=remoteId,mime=mimeHint??"application/octet-stream",version:string|null=null,modified:string|null=null,url:string,init:RequestInit={headers:{authorization:`Bearer ${access}`}};
  if(connection.provider==="google_drive"){
    const m=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(remoteId)}?fields=id,name,mimeType,modifiedTime,version`,{headers:{authorization:`Bearer ${access}`}});if(!m.ok)throw new Error("SOURCE_METADATA_FAILED");const meta=await m.json() as any;name=meta.name;mime=meta.mimeType;version=meta.version?String(meta.version):null;modified=meta.modifiedTime??null;
    url=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(remoteId)}?alt=media`;if(String(mime).startsWith("application/vnd.google-apps.")){url=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(remoteId)}/export?mimeType=text/plain`;mime="text/plain";}
  }else if(connection.provider==="dropbox"){
    url="https://content.dropboxapi.com/2/files/download";init={headers:{authorization:`Bearer ${access}`,"Dropbox-API-Arg":JSON.stringify({path:remoteId})}};
  }else{
    const m=await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(remoteId)}`,{headers:{authorization:`Bearer ${access}`}});if(!m.ok)throw new Error("SOURCE_METADATA_FAILED");const meta=await m.json() as any;name=meta.name;mime=meta.file?.mimeType??mime;version=meta.eTag??meta.cTag??null;modified=meta.lastModifiedDateTime??null;url=`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(remoteId)}/content`;
  }
  const result=await boundedFetchBuffer(url,init,MAX_SOURCE_BYTES);
  if(connection.provider==="dropbox"){const meta=JSON.parse(result.response.headers.get("dropbox-api-result")??"{}");name=meta.name??name;version=meta.rev??null;modified=meta.server_modified??null;}
  return {bytes:result.bytes,name,mime,version,modified};
}
