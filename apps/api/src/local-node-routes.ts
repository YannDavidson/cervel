import type { FastifyInstance, FastifyRequest } from "fastify";
import { withTransaction } from "./db";
import { assertPrincipalInNode } from "./access";
import { resolveRetrievalScope } from "./retrieval";
import { listVaultExplorerObjects, loadVaultExplorer, loadVaultExplorerObject } from "./vault-explorer";
import { fileLifeCko } from "./life-corpus";
import { fileEnterpriseCko } from "./enterprise-corpus";
import { addManualMembership } from "./corpus-engine";

function principal(request: FastifyRequest): string {
  const value=request.headers["x-cervel-principal-id"];
  if(typeof value!=="string"||!value)throw Object.assign(new Error("LOCAL_PRINCIPAL_REQUIRED"),{statusCode:401});
  return value;
}

async function assertWorkspace(client:any,nodeId:string,workspaceId:string){
  const workspace=await client.query(`SELECT id,name,slug FROM workspaces WHERE id=$1 AND node_id=$2`,[workspaceId,nodeId]);
  if(workspace.rowCount!==1)throw Object.assign(new Error("WORKSPACE_NOT_FOUND"),{statusCode:404});
  return workspace.rows[0];
}

export function registerLocalNodeRoutes(app: FastifyInstance): void {
  app.get("/v1/local/overview",async(request)=>withTransaction(async client=>{
    const principalId=principal(request),node=await client.query(`SELECT n.id,n.name,n.slug,n.deployment_mode FROM nodes n JOIN principals p ON p.node_id=n.id WHERE p.id=$1`,[principalId]);
    if(node.rowCount!==1)throw Object.assign(new Error("LOCAL_NODE_NOT_FOUND"),{statusCode:404});
    const nodeId=node.rows[0].id;await assertPrincipalInNode(client,principalId,nodeId);
    const [objects,artifacts,fragments,answers,activity,size]=await Promise.all([
      client.query(`SELECT count(*)::int AS count FROM knowledge_objects WHERE node_id=$1 AND lifecycle_status<>'deleted'`,[nodeId]),
      client.query(`SELECT count(*)::int AS count FROM artifacts WHERE node_id=$1`,[nodeId]),
      client.query(`SELECT count(*)::int AS count FROM fragments WHERE node_id=$1`,[nodeId]),
      client.query(`SELECT count(*)::int AS count FROM answers WHERE node_id=$1`,[nodeId]),
      client.query(`SELECT pe.id,pe.event_type,pe.occurred_at,pe.actor_type FROM provenance_events pe WHERE pe.node_id=$1 ORDER BY pe.occurred_at DESC LIMIT 12`,[nodeId]),
      client.query(`SELECT pg_database_size(current_database())::text AS bytes`)
    ]);
    return {node:node.rows[0],counts:{objects:objects.rows[0].count,artifacts:artifacts.rows[0].count,fragments:fragments.rows[0].count,answers:answers.rows[0].count},database_bytes:size.rows[0].bytes,activity:activity.rows};
  }));
  app.get("/v1/local/explorer",async(request)=>withTransaction(async client=>{
    const principalId=principal(request),{node_id,workspace_id}=request.query as {node_id?:string;workspace_id?:string};if(!node_id||!workspace_id)throw Object.assign(new Error("NODE_AND_WORKSPACE_REQUIRED"),{statusCode:400});await assertPrincipalInNode(client,principalId,node_id);
    return loadVaultExplorer(client,{nodeId:node_id,workspaceId:workspace_id,principalId});
  }));
  app.get("/v1/local/explorer/objects",async(request)=>withTransaction(async client=>{
    const principalId=principal(request),{node_id,workspace_id,type,q,corpus_key,mega_tab,subtab,limit}=request.query as {node_id?:string;workspace_id?:string;type?:string;q?:string;corpus_key?:string;mega_tab?:string;subtab?:string;limit?:string};if(!node_id||!workspace_id)throw Object.assign(new Error("NODE_AND_WORKSPACE_REQUIRED"),{statusCode:400});await assertPrincipalInNode(client,principalId,node_id);
    return listVaultExplorerObjects(client,{nodeId:node_id,workspaceId:workspace_id,principalId,type,query:q,corpusKey:corpus_key,megaTab:mega_tab,subtab,limit:limit?Number(limit):100});
  }));
  app.post("/v1/local/explorer/file",async(request,reply)=>withTransaction(async client=>{
    const principalId=principal(request),body=request.body as {node_id?:string;workspace_id?:string;cko_id?:string;corpus_key?:string;mega_tab?:string;subtab?:string};
    if(!body.node_id||!body.workspace_id||!body.cko_id||!body.corpus_key||!body.mega_tab)throw Object.assign(new Error("CORPUS_FILE_CONTEXT_REQUIRED"),{statusCode:400});
    await assertPrincipalInNode(client,principalId,body.node_id);await assertWorkspace(client,body.node_id,body.workspace_id);
    if(body.corpus_key==="life"){
      const filed=await fileLifeCko(client,{nodeId:body.node_id,workspaceId:body.workspace_id,principalId,ckoId:body.cko_id,megaTab:body.mega_tab,subtab:body.subtab});
      return reply.code(201).send({corpus_key:"life",membership:filed});
    }
    const tenants=await client.query(
      `SELECT t.id FROM enterprise_tenants t
         JOIN corpus_definitions cd ON cd.id=t.corpus_id
         JOIN enterprise_tenant_members m ON m.tenant_id=t.id AND m.principal_id=$3 AND m.role IN('contributor','manager','authority')
        WHERE cd.node_id=$1 AND cd.workspace_id=$2 AND t.status='active'
        ORDER BY t.is_default DESC,t.created_at ASC LIMIT 2`,
      [body.node_id,body.workspace_id,principalId]
    );
    if(tenants.rowCount!==1)throw Object.assign(new Error("ENTERPRISE_TENANT_CONTEXT_REQUIRED"),{statusCode:409});
    if(body.corpus_key==="enterprise"){
      const filed=await fileEnterpriseCko(client,{tenantId:tenants.rows[0].id,principalId,ckoId:body.cko_id,megaTab:body.mega_tab,subtab:body.subtab,authorityStatus:"reported"});
      return reply.code(201).send({corpus_key:"enterprise",membership:filed});
    }
    const corpus=await client.query(`SELECT id FROM corpus_definitions WHERE node_id=$1 AND workspace_id=$2 AND corpus_key=$3 AND enabled=true AND built_in=true`,[body.node_id,body.workspace_id,body.corpus_key]);
    if(corpus.rowCount!==1)throw Object.assign(new Error("CORPUS_FILE_KEY_INVALID"),{statusCode:400});
    const filed=await addManualMembership(client,{corpusId:corpus.rows[0].id,ckoId:body.cko_id,principalId,megaTab:body.mega_tab,tab:"overview",subtab:body.subtab});
    return reply.code(201).send({corpus_key:body.corpus_key,membership:filed});
  }));
  app.get("/v1/local/explorer/objects/:id",async(request)=>withTransaction(async client=>{
    const principalId=principal(request),{node_id,workspace_id}=request.query as {node_id?:string;workspace_id?:string};const {id}=request.params as {id:string};if(!node_id||!workspace_id)throw Object.assign(new Error("NODE_AND_WORKSPACE_REQUIRED"),{statusCode:400});await assertPrincipalInNode(client,principalId,node_id);
    return loadVaultExplorerObject(client,{nodeId:node_id,workspaceId:workspace_id,principalId,ckoId:id});
  }));
  app.get("/v1/local/objects",async(request)=>withTransaction(async client=>{
    const principalId=principal(request),{node_id,type,q}=request.query as {node_id?:string;type?:string;q?:string};if(!node_id)throw Object.assign(new Error("NODE_ID_REQUIRED"),{statusCode:400});await assertPrincipalInNode(client,principalId,node_id);
    const values:any[]=[node_id],where=[`ko.node_id=$1`,`ko.lifecycle_status<>'deleted'`];if(type){values.push(type);where.push(`ko.type=$${values.length}`);}if(q){values.push(`%${q}%`);where.push(`(ko.title ILIKE $${values.length} OR coalesce(ko.summary,'') ILIKE $${values.length})`);}
    const result=await client.query(`SELECT ko.id,ko.type,ko.title,ko.summary,ko.created_at,ko.updated_at,count(a.id)::int AS artifact_count FROM knowledge_objects ko LEFT JOIN artifacts a ON a.cko_id=ko.id WHERE ${where.join(" AND ")} GROUP BY ko.id ORDER BY ko.updated_at DESC LIMIT 200`,values);return {objects:result.rows};
  }));
  app.get("/v1/local/graph",async(request)=>withTransaction(async client=>{
    const principalId=principal(request),{node_id,workspace_id}=request.query as {node_id?:string;workspace_id?:string};
    if(!node_id||!workspace_id)throw Object.assign(new Error("NODE_AND_WORKSPACE_REQUIRED"),{statusCode:400});
    await assertPrincipalInNode(client,principalId,node_id);await assertWorkspace(client,node_id,workspace_id);
    const scope=await resolveRetrievalScope(client,{nodeId:node_id,principalId,workspaceId:workspace_id});
    if(scope.allowedCkoIds&&scope.allowedCkoIds.length===0)return {nodes:[],edges:[],scope:{node_id,workspace_id,principal_id:principalId,policy_snapshot_hash:scope.policySnapshotHash},projection_source:"permission-aware-claim-evidence"};
    const edges=await client.query(
      `SELECT DISTINCT c.id,c.created_at,c.semantic_subject_entity_id AS source,c.semantic_object_entity_id AS target,
              coalesce(c.semantic_predicate,c.predicate) AS label,c.confidence,
              ce.fragment_id AS evidence_fragment_id,f.cko_id AS source_cko_id
         FROM claims c
         JOIN claim_evidence ce ON ce.claim_id=c.id
         JOIN fragments f ON f.id=ce.fragment_id
         JOIN knowledge_objects ko ON ko.id=f.cko_id
        WHERE c.node_id=$1
          AND ko.node_id=$1
          AND ko.workspace_id=$2
          AND ko.lifecycle_status<>'deleted'
          AND ($3::uuid[] IS NULL OR ko.id=ANY($3::uuid[]))
          AND c.semantic_subject_entity_id IS NOT NULL
          AND c.semantic_object_entity_id IS NOT NULL
        ORDER BY c.created_at DESC LIMIT 300`,
      [node_id,workspace_id,scope.allowedCkoIds]
    );
    const ids=[...new Set(edges.rows.flatMap(row=>[row.source,row.target]))];
    const entities=ids.length?await client.query(`SELECT id,canonical_name AS label,kind AS type,resolution_confidence FROM entities WHERE node_id=$1 AND id=ANY($2::uuid[]) ORDER BY canonical_name`,[node_id,ids]):{rows:[]};
    return {nodes:entities.rows,edges:edges.rows,scope:{node_id,workspace_id,principal_id:principalId,policy_snapshot_hash:scope.policySnapshotHash},projection_source:"permission-aware-claim-evidence"};
  }));
  app.get("/v1/local/deliverables",async(request)=>withTransaction(async client=>{
    const principalId=principal(request),{node_id,workspace_id}=request.query as {node_id?:string;workspace_id?:string};
    if(!node_id||!workspace_id)throw Object.assign(new Error("NODE_AND_WORKSPACE_REQUIRED"),{statusCode:400});
    await assertPrincipalInNode(client,principalId,node_id);const workspace=await assertWorkspace(client,node_id,workspace_id);
    const rows=await client.query(`SELECT d.id,d.title,d.format,d.version,d.approval_status,d.updated_at,d.manifest_sha256,
      count(DISTINCT db.block_id)::int AS block_count,count(DISTINCT dr.id)::int AS render_count,
      count(DISTINCT dd.resource_id) FILTER (WHERE dd.propagation_status<>'current')::int AS stale_dependency_count
      FROM deliverables d LEFT JOIN deliverable_blocks db ON db.deliverable_id=d.id LEFT JOIN deliverable_renders dr ON dr.deliverable_id=d.id LEFT JOIN deliverable_dependencies dd ON dd.deliverable_id=d.id
      WHERE d.node_id=$1 AND d.workspace_id=$2 GROUP BY d.id ORDER BY d.updated_at DESC LIMIT 100`,[node_id,workspace_id]);
    return {workspace,deliverables:rows.rows,projection_source:"canonical-deliverable-manifests"};
  }));
  app.get("/v1/local/connections",async(request)=>withTransaction(async client=>{
    const principalId=principal(request),{node_id,workspace_id}=request.query as {node_id?:string;workspace_id?:string};
    if(!node_id||!workspace_id)throw Object.assign(new Error("NODE_AND_WORKSPACE_REQUIRED"),{statusCode:400});
    await assertPrincipalInNode(client,principalId,node_id);await assertWorkspace(client,node_id,workspace_id);
    const [clients,grants,receipts]=await Promise.all([
      client.query(`SELECT id,name,client_kind,client_id,created_at,revoked_at FROM external_gateway_clients WHERE node_id=$1 ORDER BY created_at DESC`,[node_id]),
      client.query(`SELECT client_id,count(*)::int AS active_grants,max(expires_at) AS latest_expiry FROM external_access_grants WHERE node_id=$1 AND (workspace_id=$2 OR workspace_id IS NULL) AND revoked_at IS NULL AND expires_at>now() GROUP BY client_id`,[node_id,workspace_id]),
      client.query(`SELECT client_id,count(*)::int AS receipt_count,max(occurred_at) AS last_activity FROM external_access_receipts WHERE node_id=$1 AND (workspace_id=$2 OR workspace_id IS NULL) GROUP BY client_id`,[node_id,workspace_id])
    ]);
    const grantMap=new Map(grants.rows.map((row:any)=>[row.client_id,row])),receiptMap=new Map(receipts.rows.map((row:any)=>[row.client_id,row]));
    const connections=clients.rows.map((row:any)=>({...row,active_grants:Number(grantMap.get(row.id)?.active_grants??0),latest_expiry:grantMap.get(row.id)?.latest_expiry??null,receipt_count:Number(receiptMap.get(row.id)?.receipt_count??0),last_activity:receiptMap.get(row.id)?.last_activity??null}));
    return {connections,mcp:{transport:"stdio",server_command:"npm run start:mcp",tool_names:["cervel_search","cervel_reason","cervel_trace","cervel_write_proposal"],registered_clients:connections.filter((x:any)=>x.client_kind==="mcp"&&!x.revoked_at).length},projection_source:"external-gateway-runtime"};
  }));
}
