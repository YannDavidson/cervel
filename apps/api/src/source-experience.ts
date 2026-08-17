import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { addWatch, syncWatch } from "./connectors";
import { listProviderItems, providerDelta, loadConnection, providerAccessToken, type PickerItem } from "./source-provider";
import { uuidv7 } from "./uuidv7";

type Session = Record<string, unknown>;
function scope(session: Session) {
  const nodeId=String(session.node_id),workspaceId=session.workspace_id?String(session.workspace_id):"",principalId=String(session.principal_id);
  if(!workspaceId) throw Object.assign(new Error("WORKSPACE_SESSION_SCOPE_REQUIRED"),{statusCode:400});
  return {nodeId,workspaceId,principalId};
}
function digest(value:string){return createHash("sha256").update(value).digest("hex");}

export async function browseSource(client:PoolClient,session:Session,connectionId:string,parentId?:string|null,cursor?:string|null){
  const s=scope(session),connection=await loadConnection(client,connectionId,s.nodeId,s.workspaceId);
  const page=await listProviderItems(client,connection,parentId,cursor);
  for(const item of page.items){
    await client.query(`INSERT INTO source_picker_cache(id,connection_id,remote_id,parent_remote_id,remote_kind,name,mime_type,remote_path,modified_at,version,metadata)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'{}'::jsonb)
      ON CONFLICT(connection_id,remote_id) DO UPDATE SET parent_remote_id=EXCLUDED.parent_remote_id,remote_kind=EXCLUDED.remote_kind,name=EXCLUDED.name,mime_type=EXCLUDED.mime_type,remote_path=EXCLUDED.remote_path,modified_at=EXCLUDED.modified_at,version=EXCLUDED.version,observed_at=now()`,
      [uuidv7(),connectionId,item.remote_id,item.parent_remote_id??null,item.remote_kind,item.name,item.mime_type??null,item.remote_path??null,item.modified_at??null,item.version??null]);
  }
  return page;
}

async function walkFolder(client:PoolClient,connectionId:string,session:Session,parentId:string,depth:number,maxDepth:number,out:PickerItem[]){
  if(depth>maxDepth)return; let cursor:string|null=null;
  do {const page=await browseSource(client,session,connectionId,parentId,cursor);cursor=page.cursor;
    for(const item of page.items){out.push(item);if(item.remote_kind==="folder")await walkFolder(client,connectionId,session,item.remote_id,depth+1,maxDepth,out);}
  } while(cursor);
}

export async function createSourceWatch(client:PoolClient,session:Session,input:{connectionId:string;remoteId:string;name:string;remoteKind:"file"|"folder";libraryId?:string|null;intervalMinutes?:number;recursive?:boolean}){
  const watch=await addWatch(client,session,{connectionId:input.connectionId,remoteId:input.remoteId,name:input.name,remoteKind:input.remoteKind,libraryId:input.libraryId,intervalMinutes:input.intervalMinutes??60});
  await client.query(`UPDATE watched_sources SET recursive=$2,delta_mode=CASE WHEN $3='folder' THEN 'delta' ELSE delta_mode END,updated_at=now() WHERE id=$1`,[watch.id,Boolean(input.recursive),input.remoteKind]);
  if(input.remoteKind==="folder"&&input.recursive){
    const items:PickerItem[]=[];await walkFolder(client,input.connectionId,session,input.remoteId,0,20,items);
    for(const item of items.filter(x=>x.remote_kind==="file")){
      const child=await addWatch(client,session,{connectionId:input.connectionId,remoteId:item.remote_id,name:item.name,remoteKind:"file",mimeType:item.mime_type??undefined,libraryId:input.libraryId,intervalMinutes:input.intervalMinutes??60});
      await client.query(`UPDATE watched_sources SET parent_remote_id=$2,delta_mode='delta',metadata=metadata||$3::jsonb WHERE id=$1`,[child.id,input.remoteId,JSON.stringify({managed_by_folder_watch:watch.id,remote_path:item.remote_path??null})]);
    }
  }
  return (await client.query(`SELECT * FROM watched_sources WHERE id=$1`,[watch.id])).rows[0];
}

export async function syncConnectionDelta(client:PoolClient,connectionId:string,nodeId?:string,workspaceId?:string){
  const connection=await loadConnection(client,connectionId,nodeId,workspaceId);let cursor=connection.delta_cursor??null,total=0,hasMore=true;
  while(hasMore&&total<1000){const page=await providerDelta(client,connection,cursor);cursor=page.cursor;hasMore=page.has_more;
    for(const item of page.items){
      const watches=await client.query(`SELECT * FROM watched_sources WHERE connection_id=$1 AND sync_enabled=true AND (remote_id=$2 OR recursive=true)`,[connectionId,item.remote_id]);
      for(const watch of watches.rows){
        const eventType=item.deleted?"deleted":"updated";
        await client.query(`INSERT INTO source_delta_events(id,connection_id,watched_source_id,provider,remote_id,event_type,provider_cursor,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,[uuidv7(),connectionId,watch.id,connection.provider,item.remote_id,eventType,cursor,JSON.stringify(item)]);
        if(item.deleted){await client.query(`UPDATE source_documents SET deleted_at=now(),is_current=false WHERE watched_source_id=$1 AND remote_id=$2`,[watch.id,item.remote_id]);}
        else if(item.remote_kind==="file"){
          let target=watch;
          if(watch.remote_kind!=="file"||watch.remote_id!==item.remote_id){
            const session={node_id:watch.node_id,workspace_id:watch.workspace_id,principal_id:watch.principal_id};
            target=await addWatch(client,session,{connectionId,remoteId:item.remote_id,name:item.name,remoteKind:"file",mimeType:item.mime_type??undefined,libraryId:watch.library_id,intervalMinutes:watch.sync_interval_minutes});
            await client.query(`UPDATE watched_sources SET parent_remote_id=$2,delta_mode='delta',metadata=metadata||$3::jsonb WHERE id=$1`,[target.id,watch.remote_id,JSON.stringify({managed_by_folder_watch:watch.id,remote_path:item.remote_path??null})]);
          }
          await syncWatch(client,target.id);
        }
      }
      total++;
    }
  }
  await client.query(`UPDATE source_connections SET delta_cursor=$2,delta_cursor_updated_at=now(),updated_at=now() WHERE id=$1`,[connectionId,cursor]);
  await client.query(`UPDATE source_delta_events SET processed_at=now() WHERE connection_id=$1 AND processed_at IS NULL`,[connectionId]);
  return {processed:total,cursor,has_more:hasMore};
}

export async function acceptWebhook(client:PoolClient,provider:string,headers:Record<string,unknown>,body:unknown){
  const subscriptionId=String(headers["x-goog-channel-id"]??headers["x-cervel-subscription-id"]??"");
  if(provider==="google_drive"&&subscriptionId){
    const sub=await client.query(`SELECT * FROM source_webhook_subscriptions WHERE provider='google_drive' AND provider_subscription_id=$1 AND status='active'`,[subscriptionId]);
    if(sub.rowCount!==1)throw Object.assign(new Error("WEBHOOK_SUBSCRIPTION_INVALID"),{statusCode:401});
    const supplied=String(headers["x-goog-channel-token"]??"");
    if(!supplied||digest(supplied)!==sub.rows[0].channel_token_hash)throw Object.assign(new Error("WEBHOOK_TOKEN_INVALID"),{statusCode:401});
    await client.query(`UPDATE source_webhook_subscriptions SET last_event_at=now(),updated_at=now() WHERE id=$1`,[sub.rows[0].id]);
    return {accepted:true,connection_id:sub.rows[0].connection_id};
  }
  if(provider==="onedrive"){
    const notifications=Array.isArray((body as any)?.value)?(body as any).value:[];let accepted=0;
    for(const n of notifications){
      const sub=await client.query(`SELECT * FROM source_webhook_subscriptions WHERE provider='onedrive' AND provider_subscription_id=$1 AND status='active'`,[String(n.subscriptionId??"")]);
      if(sub.rowCount!==1)continue;
      const state=String(n.clientState??"");if(!state||digest(state)!==sub.rows[0].channel_token_hash)continue;
      await client.query(`UPDATE source_webhook_subscriptions SET last_event_at=now(),updated_at=now() WHERE id=$1`,[sub.rows[0].id]);accepted++;
    }
    return {accepted:true,count:accepted};
  }
  if(provider==="dropbox"){
    const accounts=Object.keys((body as any)?.list_folder?.accounts??{});if(accounts.length===0)return {accepted:true,count:0};
    await client.query(`UPDATE source_connections SET delta_cursor_updated_at=coalesce(delta_cursor_updated_at,now()) WHERE provider='dropbox' AND account_subject=ANY($1::text[])`,[accounts]);
    return {accepted:true,count:accounts.length};
  }
  throw Object.assign(new Error("WEBHOOK_PROVIDER_INVALID"),{statusCode:400});
}

export async function activateProviderWebhook(client:PoolClient,session:Session,connectionId:string,watchId?:string|null){
  const s=scope(session),connection=await loadConnection(client,connectionId,s.nodeId,s.workspaceId),base=process.env.CERVEL_PUBLIC_BASE_URL;
  if(!base)throw Object.assign(new Error("CERVEL_PUBLIC_BASE_URL_REQUIRED"),{statusCode:503});
  const callback=`${base.replace(/\/$/,"")}/v1/connectors/webhooks/${connection.provider}`;
  const id=uuidv7(),secret=randomBytes(32).toString("base64url"),secretHash=digest(secret);
  if(connection.provider==="dropbox"){
    await client.query(`INSERT INTO source_webhook_subscriptions(id,connection_id,watched_source_id,provider,provider_subscription_id,channel_token_hash,callback_path,status) VALUES($1,$2,$3,'dropbox',$4,$5,$6,'active')`,[id,connectionId,watchId??null,connectionId,secretHash,callback]);
    await client.query(`UPDATE source_connections SET webhook_status='active',updated_at=now() WHERE id=$1`,[connectionId]);
    return {id,provider:"dropbox",callback_url:callback,note:"Configure this URL once in the Dropbox app console; Dropbox webhooks are app-level."};
  }
  const access=await providerAccessToken(client,connection);
  if(connection.provider==="google_drive"){
    let cursor=connection.delta_cursor;if(!cursor){const start=await providerDelta(client,connection,null);cursor=start.cursor;await client.query(`UPDATE source_connections SET delta_cursor=$2,delta_cursor_updated_at=now() WHERE id=$1`,[connectionId,cursor]);}
    const channelId=randomBytes(16).toString("hex");
    const r=await fetch(`https://www.googleapis.com/drive/v3/changes/watch?pageToken=${encodeURIComponent(String(cursor))}`,{method:"POST",headers:{authorization:`Bearer ${access}`,"content-type":"application/json"},body:JSON.stringify({id:channelId,type:"web_hook",address:callback,token:secret})});
    if(!r.ok)throw new Error("WEBHOOK_SUBSCRIBE_FAILED");const data=await r.json() as any;
    await client.query(`INSERT INTO source_webhook_subscriptions(id,connection_id,watched_source_id,provider,provider_subscription_id,channel_token_hash,resource_id,callback_path,status,expires_at) VALUES($1,$2,$3,'google_drive',$4,$5,$6,$7,'active',$8)`,[id,connectionId,watchId??null,channelId,secretHash,data.resourceId??null,callback,data.expiration?new Date(Number(data.expiration)):null]);
    await client.query(`UPDATE source_connections SET webhook_status='active',webhook_expires_at=$2,updated_at=now() WHERE id=$1`,[connectionId,data.expiration?new Date(Number(data.expiration)):null]);
    return {id,provider:"google_drive",status:"active"};
  }
  const expiration=new Date(Date.now()+48*60*60*1000).toISOString();
  const r=await fetch("https://graph.microsoft.com/v1.0/subscriptions",{method:"POST",headers:{authorization:`Bearer ${access}`,"content-type":"application/json"},body:JSON.stringify({changeType:"updated",notificationUrl:callback,resource:"/me/drive/root",expirationDateTime:expiration,clientState:secret})});
  if(!r.ok)throw new Error("WEBHOOK_SUBSCRIBE_FAILED");const data=await r.json() as any;
  await client.query(`INSERT INTO source_webhook_subscriptions(id,connection_id,watched_source_id,provider,provider_subscription_id,channel_token_hash,resource_id,callback_path,status,expires_at) VALUES($1,$2,$3,'onedrive',$4,$5,$6,$7,'active',$8)`,[id,connectionId,watchId??null,data.id,secretHash,data.resource??null,callback,data.expirationDateTime??expiration]);
  await client.query(`UPDATE source_connections SET webhook_status='active',webhook_expires_at=$2,updated_at=now() WHERE id=$1`,[connectionId,data.expirationDateTime??expiration]);
  return {id,provider:"onedrive",status:"active"};
}
