import { db,withTransaction } from "../apps/api/src/db";
import { appendCkepEvent,createCkepSubscription,pollCkepSubscription,queryCkepEvents,replayCkepStream } from "../apps/api/src/ckep-runtime";
import { mapKnowledgeEventToCkep } from "../packages/ckep/src";
import { uuidv7 } from "../apps/api/src/uuidv7";

const [nodeId,workspaceId,principalId]=process.argv.slice(2);if(!nodeId||!workspaceId||!principalId)throw new Error("node workspace principal required");
async function main(){const result=await withTransaction(async client=>{const node=(await client.query(`SELECT slug FROM nodes WHERE id=$1`,[nodeId])).rows[0];if(!node)throw new Error("node missing");const authority=node.slug as string;
  const first=mapKnowledgeEventToCkep({authority,nodeId,workspaceId,sequence:1,row:{id:uuidv7(),event_type:"RISK_DETECTED",subject_type:"project",subject_id:uuidv7(),summary:"Initial launch risk",confidence:.91,observed_at:"2026-08-18T20:00:00Z"}});
  const a=await appendCkepEvent(client,{nodeId,workspaceId,principalId,envelope:first});
  const duplicate=await appendCkepEvent(client,{nodeId,workspaceId,principalId,envelope:first});
  const second=mapKnowledgeEventToCkep({authority,nodeId,workspaceId,sequence:2,previousEventId:first.event.id.split('/').pop()!,row:{id:uuidv7(),event_type:"DECISION_CHANGED",subject_type:"decision",subject_id:uuidv7(),summary:"Pricing review required",confidence:.88,observed_at:"2026-08-18T20:01:00Z"}});
  const b=await appendCkepEvent(client,{nodeId,workspaceId,principalId,envelope:second});
  let sequenceBlocked=false;const bad={...second,event:{...second.event,id:`cke://${authority}/workspaces/${workspaceId}/events/${uuidv7()}`},integrity:{...second.integrity,sequence:4}} as any;try{await appendCkepEvent(client,{nodeId,workspaceId,principalId,envelope:bad});}catch(e:any){sequenceBlocked=String(e.message).startsWith("CKEP_INVALID:")||String(e.message).startsWith("CKEP_SEQUENCE_CONFLICT:");}
  const otherWorkspace=uuidv7();await client.query(`INSERT INTO workspaces(id,node_id,slug,name,created_by) VALUES($1,$2,$3,'CKEP foreign',$4)`,[otherWorkspace,nodeId,`ckep-${Date.now()}`,principalId]);let workspaceBlocked=false;try{await appendCkepEvent(client,{nodeId,workspaceId:otherWorkspace,principalId,envelope:first});}catch(e:any){workspaceBlocked=["CKEP_EVENT_SCOPE_MISMATCH","CKEP_SCOPE_MISMATCH"].includes(e.message);}
  const query=await queryCkepEvents(client,{nodeId,workspaceId,afterSequence:0,limit:10});const replay=await replayCkepStream(client,{nodeId,workspaceId,fromSequence:1,limit:10});
  const sub=await createCkepSubscription(client,{nodeId,workspaceId,principalId,name:"CI CKEP",eventTypes:["RISK_DETECTED","DECISION_CHANGED"],minConfidence:.5});const delivered=await pollCkepSubscription(client,{nodeId,workspaceId,principalId,subscriptionId:sub.id,limit:10});const deliveredAgain=await pollCkepSubscription(client,{nodeId,workspaceId,principalId,subscriptionId:sub.id,limit:10});const receipts=(await client.query(`SELECT count(*)::int AS count FROM ckep_delivery_receipts WHERE subscription_id=$1`,[sub.id])).rows[0].count;
  return {first_created:a.created,duplicate_idempotent:!duplicate.created,second_created:b.created,sequence_blocked:sequenceBlocked,workspace_blocked:workspaceBlocked,query_count:query.length,replay_count:replay.length,delivered_count:delivered.length,replay_safe:deliveredAgain.length===0,receipt_count:receipts,sequences:replay.map((x:any)=>Number(x.sequence))};});console.log(JSON.stringify(result));await db.end();}
main().catch(async e=>{console.error(e);await db.end();process.exit(1);});
