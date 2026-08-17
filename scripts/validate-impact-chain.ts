import { db,withTransaction } from "../apps/api/src/db";
import { inferDependenciesFromKnowledge,propagateKnowledgeImpact,upsertDependency } from "../apps/api/src/impact-engine";
import { uuidv7 } from "../apps/api/src/uuidv7";

const [nodeId,workspaceId,principalId]=process.argv.slice(2);
if(!nodeId||!workspaceId||!principalId)throw new Error("nodeId workspaceId principalId required");

async function main(){
  const result=await withTransaction(async client=>{
    const ckoId=uuidv7(),claimId=uuidv7(),ccpId=uuidv7(),answerId=uuidv7(),eventId=uuidv7(),otherWorkspaceId=uuidv7(),otherCkoId=uuidv7(),otherClaimId=uuidv7();
    await client.query(`INSERT INTO knowledge_objects(id,node_id,workspace_id,type,title,created_by) VALUES($1,$2,$3,'document','Impact root',$4)`,[ckoId,nodeId,workspaceId,principalId]);
    await client.query(`INSERT INTO claims(id,node_id,subject_type,subject_id,predicate,object_kind,literal_value,epistemic_status,confidence,created_by) VALUES($1,$2,'cko',$3,'status','literal',$4::jsonb,'claimed',0.95,$5)`,[claimId,nodeId,ckoId,JSON.stringify("changed"),principalId]);
    await client.query(`INSERT INTO context_packages(id,node_id,workspace_id,principal_id,profile,query,task_type,authorization_scope,policy_snapshot_hash) VALUES($1,$2,$3,$4,'ci','impact chain','validation','{}'::jsonb,$5)`,[ccpId,nodeId,workspaceId,principalId,"0".repeat(64)]);
    await client.query(`INSERT INTO context_claims(context_package_id,claim_id) VALUES($1,$2)`,[ccpId,claimId]);
    await client.query(`INSERT INTO answers(id,node_id,workspace_id,principal_id,context_package_id,answer_text) VALUES($1,$2,$3,$4,$5,'seed answer')`,[answerId,nodeId,workspaceId,principalId,ccpId]);
    await client.query(`INSERT INTO answer_claims(answer_id,claim_id,role,ordinal) VALUES($1,$2,'supporting',0)`,[answerId,claimId]);
    await client.query(`INSERT INTO knowledge_events(id,node_id,workspace_id,event_type,subject_type,subject_id,cko_id,summary,confidence) VALUES($1,$2,$3,'SOURCE_CHANGED','cko',$4,$4,'seed change',1)`,[eventId,nodeId,workspaceId,ckoId]);

    await client.query(`INSERT INTO workspaces(id,node_id,slug,name,created_by) VALUES($1,$2,$3,'Other workspace',$4)`,[otherWorkspaceId,nodeId,`other-${otherWorkspaceId.slice(0,8)}`,principalId]);
    await client.query(`INSERT INTO knowledge_objects(id,node_id,workspace_id,type,title,created_by) VALUES($1,$2,$3,'document','Other root',$4)`,[otherCkoId,nodeId,otherWorkspaceId,principalId]);
    await client.query(`INSERT INTO claims(id,node_id,subject_type,subject_id,predicate,object_kind,literal_value,epistemic_status,confidence,created_by) VALUES($1,$2,'cko',$3,'status','literal',$4::jsonb,'claimed',0.95,$5)`,[otherClaimId,nodeId,otherCkoId,JSON.stringify("private"),principalId]);

    await inferDependenciesFromKnowledge(client,{nodeId,workspaceId});
    const chain=await client.query(`SELECT
      EXISTS(SELECT 1 FROM knowledge_dependencies WHERE workspace_id=$1 AND source_type='claim' AND source_id=$2 AND relation='derived_from' AND target_type='cko' AND target_id=$3) claim_to_cko,
      EXISTS(SELECT 1 FROM knowledge_dependencies WHERE workspace_id=$1 AND source_type='context_package' AND source_id=$4 AND relation='depends_on' AND target_type='claim' AND target_id=$2) ccp_to_claim,
      EXISTS(SELECT 1 FROM knowledge_dependencies WHERE workspace_id=$1 AND source_type='answer' AND source_id=$5 AND relation='derived_from' AND target_type='context_package' AND target_id=$4) answer_to_ccp,
      EXISTS(SELECT 1 FROM knowledge_dependencies WHERE workspace_id=$1 AND source_type='claim' AND source_id=$6) leaked_other_claim`,[workspaceId,claimId,ckoId,ccpId,answerId,otherClaimId]);
    const flags=chain.rows[0];if(!flags.claim_to_cko||!flags.ccp_to_claim||!flags.answer_to_ccp)throw new Error(`MULTIHOP_DEPENDENCY_CHAIN_MISSING ${JSON.stringify(flags)}`);if(flags.leaked_other_claim)throw new Error("CROSS_WORKSPACE_DEPENDENCY_LEAK");

    await upsertDependency(client,{nodeId,workspaceId,sourceType:'cko',sourceId:ckoId,relation:'depends_on',targetType:'answer',targetId:answerId,confidence:.9,strength:.9,properties:{test_cycle:true}});
    const propagated=await propagateKnowledgeImpact(client,{eventId,nodeId,workspaceId,maxDepth:6,confidenceFloor:.05});
    const byKey=new Map(propagated.impacts.map((i:any)=>[`${i.impacted_type}:${i.impacted_id}`,i]));
    const claim=byKey.get(`claim:${claimId}`),ccp=byKey.get(`context_package:${ccpId}`),answer=byKey.get(`answer:${answerId}`),root=byKey.get(`cko:${ckoId}`);
    if(!claim||!ccp||!answer)throw new Error(`MULTIHOP_IMPACT_MISSING ${JSON.stringify(propagated.impacts)}`);if(root)throw new Error("CYCLE_REIMPACTED_ROOT");
    if(!(Number(claim.confidence)>Number(ccp.confidence)))throw new Error("CONFIDENCE_DID_NOT_DECAY_CKO_TO_CCP");
    if(!(Number(claim.confidence)>Number(answer.confidence)))throw new Error("ANSWER_CONFIDENCE_NOT_DECAYED_FROM_CLAIM");
    return {chain:{cko_id:ckoId,claim_id:claimId,context_package_id:ccpId,answer_id:answerId},impact_count:propagated.impacted_count,claim_confidence:Number(claim.confidence),ccp_confidence:Number(ccp.confidence),answer_confidence:Number(answer.confidence)};
  });
  console.log(JSON.stringify(result));
}
main().finally(()=>db.end());
