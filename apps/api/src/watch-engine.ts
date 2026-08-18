import type { PoolClient } from "pg";
import { uuidv7 } from "./uuidv7";

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const words=(value:string)=>new Set(value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x)=>x.length>1));
const overlap=(needles:string[],text:string)=>{if(!needles.length)return 1;const hay=words(text);let hit=0;for(const raw of needles){const token=raw.trim().toLowerCase();if(token&&hay.has(token))hit++;}return clamp(hit/needles.length);};
const severityFor=(score:number,impactKinds:string[])=>impactKinds.includes("invalidated")||score>=.88?"critical":impactKinds.includes("requires_review")||score>=.7?"important":"info";

export async function createWatch(client:PoolClient,input:{nodeId:string;workspaceId:string;principalId:string;name:string;intent:string;eventTypes?:string[];subjectTypes?:string[];impactKinds?:string[];keywords?:string[];focus?:Record<string,unknown>;minEventConfidence?:number;minImpactConfidence?:number;minScore?:number;cooldownSeconds?:number;channels?:string[]}){
  const scope=await client.query(`SELECT 1 FROM workspaces w JOIN principals p ON p.id=$3 AND p.node_id=w.node_id WHERE w.id=$1 AND w.node_id=$2`,[input.workspaceId,input.nodeId,input.principalId]);
  if(scope.rowCount!==1)throw Object.assign(new Error("WATCH_SCOPE_INVALID"),{statusCode:403});
  const id=uuidv7();
  const row=await client.query(`INSERT INTO knowledge_watches(id,node_id,workspace_id,principal_id,name,intent,event_types,subject_types,impact_kinds,keywords,focus,min_event_confidence,min_impact_confidence,min_score,cooldown_seconds,channels) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16) RETURNING *`,[id,input.nodeId,input.workspaceId,input.principalId,input.name,input.intent,input.eventTypes??[],input.subjectTypes??[],input.impactKinds??[],input.keywords??[],JSON.stringify(input.focus??{}),clamp(input.minEventConfidence??.55),clamp(input.minImpactConfidence??.35),clamp(input.minScore??.55),Math.max(0,Math.min(2592000,input.cooldownSeconds??3600)),input.channels?.length?input.channels:["inbox"]]);
  return row.rows[0];
}

function focusMatch(focus:any,event:any,impacts:any[]){
  const ids=new Set<string>((focus?.resource_ids??[]).map(String));
  const types=new Set<string>((focus?.resource_types??[]).map(String));
  const ckoIds=new Set<string>((focus?.cko_ids??[]).map(String));
  if(!ids.size&&!types.size&&!ckoIds.size)return 1;
  if(ids.has(String(event.subject_id))||types.has(String(event.subject_type))||ckoIds.has(String(event.cko_id??"")))return 1;
  for(const impact of impacts)if(ids.has(String(impact.impacted_id))||types.has(String(impact.impacted_type)))return 1;
  return 0;
}

export async function evaluateEventForWatches(client:PoolClient,input:{eventId:string;nodeId:string;workspaceId:string}){
  const eventResult=await client.query(`SELECT * FROM knowledge_events WHERE id=$1 AND node_id=$2 AND workspace_id=$3`,[input.eventId,input.nodeId,input.workspaceId]);
  if(eventResult.rowCount!==1)throw Object.assign(new Error("WATCH_EVENT_NOT_FOUND"),{statusCode:404});
  const event=eventResult.rows[0];
  const impacts=(await client.query(`SELECT kei.*,ip.id AS impact_path_id FROM knowledge_event_impacts kei LEFT JOIN impact_paths ip ON ip.propagation_run_id=kei.propagation_run_id AND ip.impacted_type=kei.impacted_type AND ip.impacted_id=kei.impacted_id AND ip.impact_kind=kei.impact_kind WHERE kei.event_id=$1 ORDER BY kei.confidence DESC`,[input.eventId])).rows;
  const watches=(await client.query(`SELECT * FROM knowledge_watches WHERE node_id=$1 AND workspace_id=$2 AND enabled=true ORDER BY created_at`,[input.nodeId,input.workspaceId])).rows;
  const results:any[]=[];
  for(const watch of watches){
    if(watch.event_types?.length&&!watch.event_types.includes(event.event_type))continue;
    if(watch.subject_types?.length&&!watch.subject_types.includes(event.subject_type))continue;
    if(Number(event.confidence)<Number(watch.min_event_confidence))continue;
    const eligibleImpacts=impacts.filter((x:any)=>Number(x.confidence)>=Number(watch.min_impact_confidence)&&(!watch.impact_kinds?.length||watch.impact_kinds.includes(x.impact_kind)));
    if(watch.impact_kinds?.length&&!eligibleImpacts.length)continue;
    const text=`${watch.name} ${watch.intent} ${event.summary} ${JSON.stringify(event.details??{})}`;
    const keywordScore=overlap(watch.keywords??[],text);
    const focusScore=focusMatch(watch.focus,event,eligibleImpacts);
    if(focusScore===0)continue;
    const eventScore=clamp(Number(event.confidence??0));
    const impactScore=clamp(eligibleImpacts.length?Math.max(...eligibleImpacts.map((x:any)=>Number(x.confidence??0))):eventScore*.6);
    const score=clamp(eventScore*.3+impactScore*.35+keywordScore*.15+focusScore*.2);
    if(score<Number(watch.min_score))continue;
    const matchId=uuidv7();
    const recent=await client.query(`SELECT wa.id FROM watch_alerts wa JOIN knowledge_events ke ON ke.id=wa.event_id WHERE wa.watch_id=$1 AND ke.subject_type=$2 AND ke.subject_id=$3 AND wa.surfaced_at > now()-make_interval(secs=>$4) ORDER BY wa.surfaced_at DESC LIMIT 1`,[watch.id,event.subject_type,event.subject_id,Number(watch.cooldown_seconds??0)]);
    const suppressed=recent.rowCount>0;
    const explanation={watch_intent:watch.intent,event_type:event.event_type,event_confidence:eventScore,impact_confidence:impactScore,keyword_score:keywordScore,focus_score:focusScore,matched_impacts:eligibleImpacts.map((x:any)=>({type:x.impacted_type,id:x.impacted_id,kind:x.impact_kind,confidence:Number(x.confidence),depth:x.depth,path:x.path}))};
    await client.query(`INSERT INTO watch_matches(id,watch_id,event_id,node_id,workspace_id,score,event_score,impact_score,keyword_score,focus_score,matched_impact_ids,explanation,suppressed,suppression_reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14) ON CONFLICT(watch_id,event_id) DO UPDATE SET score=EXCLUDED.score,event_score=EXCLUDED.event_score,impact_score=EXCLUDED.impact_score,keyword_score=EXCLUDED.keyword_score,focus_score=EXCLUDED.focus_score,matched_impact_ids=EXCLUDED.matched_impact_ids,explanation=EXCLUDED.explanation,suppressed=EXCLUDED.suppressed,suppression_reason=EXCLUDED.suppression_reason`,[matchId,watch.id,event.id,input.nodeId,input.workspaceId,score,eventScore,impactScore,keywordScore,focusScore,eligibleImpacts.map((x:any)=>x.impact_path_id).filter(Boolean),JSON.stringify(explanation),suppressed,suppressed?"cooldown":null]);
    const storedMatch=await client.query(`SELECT id FROM watch_matches WHERE watch_id=$1 AND event_id=$2`,[watch.id,event.id]);
    let alert=null;
    if(!suppressed){
      const impactKinds=eligibleImpacts.map((x:any)=>String(x.impact_kind));
      const alertId=uuidv7(),severity=severityFor(score,impactKinds),title=`${watch.name}: ${event.summary}`,body=`CERVEL Watch matched “${watch.intent}” with score ${score.toFixed(2)}.`;
      await client.query(`INSERT INTO watch_alerts(id,watch_id,match_id,event_id,node_id,workspace_id,principal_id,severity,title,body,why_now) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) ON CONFLICT(match_id) DO NOTHING`,[alertId,watch.id,storedMatch.rows[0].id,event.id,input.nodeId,input.workspaceId,watch.principal_id,severity,title,body,JSON.stringify(explanation)]);
      alert=(await client.query(`SELECT * FROM watch_alerts WHERE match_id=$1`,[storedMatch.rows[0].id])).rows[0]??null;
    }
    results.push({watch_id:watch.id,match_id:storedMatch.rows[0].id,score,suppressed,alert});
  }
  return results;
}

export async function reevaluateRecentEvents(client:PoolClient,input:{nodeId:string;workspaceId:string;since?:string;limit?:number}){
  const since=input.since??new Date(Date.now()-7*86400000).toISOString();if(Number.isNaN(Date.parse(since)))throw Object.assign(new Error("INVALID_SINCE"),{statusCode:400});
  const events=(await client.query(`SELECT id FROM knowledge_events WHERE node_id=$1 AND workspace_id=$2 AND observed_at >= $3 ORDER BY observed_at ASC LIMIT $4`,[input.nodeId,input.workspaceId,since,Math.max(1,Math.min(500,input.limit??100))])).rows;
  const evaluated:any[]=[];for(const row of events)evaluated.push(...await evaluateEventForWatches(client,{eventId:row.id,nodeId:input.nodeId,workspaceId:input.workspaceId}));return evaluated;
}
