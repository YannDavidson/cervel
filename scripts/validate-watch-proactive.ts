import { withTransaction, db } from "../apps/api/src/db";
import { uuidv7 } from "../apps/api/src/uuidv7";
import { createWatch, evaluateEventForWatches } from "../apps/api/src/watch-engine";

async function main(){
  const [nodeId,workspaceId,principalId]=process.argv.slice(2);if(!nodeId||!workspaceId||!principalId)throw new Error("nodeId workspaceId principalId required");
  const result=await withTransaction(async client=>{
    const otherWorkspace=uuidv7();await client.query(`INSERT INTO workspaces(id,node_id,slug,name,created_by) VALUES($1,$2,$3,$4,$5)`,[otherWorkspace,nodeId,`watch-ci-${otherWorkspace.slice(0,8)}`,"Watch Isolation",principalId]);
    const projectId=uuidv7(),subjectId=uuidv7();
    const watch=await createWatch(client,{nodeId,workspaceId,principalId,name:"Launch risk watch",intent:"Tell me when launch risk affects this project",impactKinds:["requires_review"],focus:{resource_ids:[projectId]},minScore:.55,cooldownSeconds:3600});
    const eventId=uuidv7();await client.query(`INSERT INTO knowledge_events(id,node_id,workspace_id,event_type,subject_type,subject_id,summary,details,confidence) VALUES($1,$2,$3,'RISK_DETECTED','project',$4,$5,$6::jsonb,.92)`,[eventId,nodeId,workspaceId,subjectId,"Launch risk detected for project delivery",JSON.stringify({risk:"launch delay"})]);
    await client.query(`INSERT INTO knowledge_event_impacts(event_id,impacted_type,impacted_id,impact_kind,confidence,details,depth,path) VALUES($1,'project',$2,'requires_review',.82,$3::jsonb,2,$4::jsonb)`,[eventId,projectId,JSON.stringify({reason:"delivery dependency"}),JSON.stringify([{relation:"depends_on"}])]);
    const matches=await evaluateEventForWatches(client,{eventId,nodeId,workspaceId});if(matches.length!==1||!matches[0].alert)throw new Error(`EXPECTED_PROACTIVE_ALERT ${JSON.stringify(matches)}`);if(matches[0].score<.55)throw new Error("WATCH_SCORE_TOO_LOW");
    const foreignEvent=uuidv7();await client.query(`INSERT INTO knowledge_events(id,node_id,workspace_id,event_type,subject_type,subject_id,summary,confidence) VALUES($1,$2,$3,'RISK_DETECTED','project',$4,'Launch risk detected for project delivery',.99)`,[foreignEvent,nodeId,otherWorkspace,uuidv7()]);
    const foreignMatches=await evaluateEventForWatches(client,{eventId:foreignEvent,nodeId,workspaceId:otherWorkspace});if(foreignMatches.length!==0)throw new Error("CROSS_WORKSPACE_WATCH_LEAK");
    const repeatEvent=uuidv7();await client.query(`INSERT INTO knowledge_events(id,node_id,workspace_id,event_type,subject_type,subject_id,summary,details,confidence) VALUES($1,$2,$3,'RISK_DETECTED','project',$4,$5,$6::jsonb,.91)`,[repeatEvent,nodeId,workspaceId,subjectId,"Launch risk detected again for project delivery",JSON.stringify({risk:"launch delay"})]);
    await client.query(`INSERT INTO knowledge_event_impacts(event_id,impacted_type,impacted_id,impact_kind,confidence,details) VALUES($1,'project',$2,'requires_review',.8,'{}'::jsonb)`,[repeatEvent,projectId]);
    const repeat=await evaluateEventForWatches(client,{eventId:repeatEvent,nodeId,workspaceId});if(repeat.length!==1||!repeat[0].suppressed||repeat[0].alert)throw new Error(`COOLDOWN_NOT_ENFORCED ${JSON.stringify(repeat)}`);
    const inbox=(await client.query(`SELECT * FROM watch_alerts WHERE watch_id=$1 AND principal_id=$2`,[watch.id,principalId])).rows;if(inbox.length!==1)throw new Error("EXPECTED_ONE_DURABLE_ALERT");
    const match=(await client.query(`SELECT explanation FROM watch_matches WHERE watch_id=$1 AND event_id=$2`,[watch.id,eventId])).rows[0];if(!match?.explanation?.matched_impacts?.length)throw new Error("WHY_NOW_IMPACT_PATH_MISSING");
    return {watch_id:watch.id,event_id:eventId,score:matches[0].score,severity:matches[0].alert.severity,foreign_matches:foreignMatches.length,cooldown_suppressed:repeat[0].suppressed,inbox_count:inbox.length,why_now_impacts:match.explanation.matched_impacts.length};
  });
  console.log(JSON.stringify(result));
}
main().finally(()=>db.end());
