import { db,withTransaction } from "../apps/api/src/db";
import { uuidv7 } from "../apps/api/src/uuidv7";
import { loadAgentScope,writeAgentObservation } from "../apps/api/src/agent-runtime";

const [nodeId,workspaceId,adminId]=process.argv.slice(2);if(!nodeId||!workspaceId||!adminId)throw new Error("node workspace admin required");
const result=await withTransaction(async client=>{
  const principalId=uuidv7(),agentId=uuidv7();
  await client.query(`INSERT INTO principals(id,node_id,principal_type,display_name,status) VALUES($1,$2,'service','CI Agent','active')`,[principalId,nodeId]);
  await client.query(`INSERT INTO agent_identities(id,node_id,principal_id,name,kind,capabilities) VALUES($1,$2,$3,'CI Agent','external',$4)`,[agentId,nodeId,principalId,["memory","context","signals"]]);
  await client.query(`INSERT INTO agent_workspace_grants(agent_id,node_id,workspace_id,permissions,created_by) VALUES($1,$2,$3,$4,$5)`,[agentId,nodeId,workspaceId,["memory:read","memory:write","claim:write","context:read","events:read","watch:read"],adminId]);
  const object=(await client.query(`SELECT id FROM knowledge_objects WHERE node_id=$1 AND workspace_id=$2 LIMIT 1`,[nodeId,workspaceId])).rows[0];
  if(!object)throw new Error("bootstrap object missing");
  const observation=await writeAgentObservation(client,{principalId,nodeId,workspaceId,subjectType:"cko",subjectId:object.id,observation:"Agent observed a durable workspace-scoped fact.",confidence:.91,claim:{predicate:"agent_observed",literalValue:{value:true}}});
  const scope=await loadAgentScope(client,{principalId,nodeId,workspaceId,permission:"memory:read"});
  const otherWorkspace=uuidv7();await client.query(`INSERT INTO workspaces(id,node_id,slug,name,created_by) VALUES($1,$2,$3,'Foreign Workspace',$4)`,[otherWorkspace,nodeId,`foreign-${Date.now()}`,adminId]);
  let tenantBlocked=false;try{await loadAgentScope(client,{principalId,nodeId,workspaceId:otherWorkspace,permission:"memory:read"});}catch(e:any){tenantBlocked=e.message==="AGENT_WORKSPACE_FORBIDDEN";}
  const claim=(await client.query(`SELECT qualifiers,created_by FROM claims WHERE id=$1`,[observation.created_claim_id])).rows[0];
  return {agent_id:scope.id,observation_id:observation.id,claim_id:observation.created_claim_id,claim_agent_id:claim.qualifiers.agent_id,tenant_blocked:tenantBlocked,permissions:scope.permissions};
});
console.log(JSON.stringify(result));await db.end();
