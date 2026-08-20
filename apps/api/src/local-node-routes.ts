import type { FastifyInstance, FastifyRequest } from "fastify";
import { withTransaction } from "./db";
import { assertPrincipalInNode } from "./access";

function principal(request: FastifyRequest): string {
  const value=request.headers["x-cervel-principal-id"];
  if(typeof value!=="string"||!value)throw Object.assign(new Error("LOCAL_PRINCIPAL_REQUIRED"),{statusCode:401});
  return value;
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
  app.get("/v1/local/objects",async(request)=>withTransaction(async client=>{
    const principalId=principal(request),{node_id,type,q}=request.query as {node_id?:string;type?:string;q?:string};if(!node_id)throw Object.assign(new Error("NODE_ID_REQUIRED"),{statusCode:400});await assertPrincipalInNode(client,principalId,node_id);
    const values:any[]=[node_id],where=[`ko.node_id=$1`,`ko.lifecycle_status<>'deleted'`];if(type){values.push(type);where.push(`ko.type=$${values.length}`);}if(q){values.push(`%${q}%`);where.push(`(ko.title ILIKE $${values.length} OR coalesce(ko.summary,'') ILIKE $${values.length})`);}
    const result=await client.query(`SELECT ko.id,ko.type,ko.title,ko.summary,ko.created_at,ko.updated_at,count(a.id)::int AS artifact_count FROM knowledge_objects ko LEFT JOIN artifacts a ON a.cko_id=ko.id WHERE ${where.join(" AND ")} GROUP BY ko.id ORDER BY ko.updated_at DESC LIMIT 200`,values);return {objects:result.rows};
  }));
  app.get("/v1/local/graph",async(request)=>withTransaction(async client=>{
    const principalId=principal(request),{node_id}=request.query as {node_id?:string};if(!node_id)throw Object.assign(new Error("NODE_ID_REQUIRED"),{statusCode:400});await assertPrincipalInNode(client,principalId,node_id);
    const edges=await client.query(`SELECT id,semantic_subject_entity_id AS source,semantic_object_entity_id AS target,coalesce(semantic_predicate,predicate) AS label,confidence FROM claims WHERE node_id=$1 AND semantic_subject_entity_id IS NOT NULL AND semantic_object_entity_id IS NOT NULL ORDER BY created_at DESC LIMIT 300`,[node_id]);
    const ids=[...new Set(edges.rows.flatMap(row=>[row.source,row.target]))];const entities=ids.length?await client.query(`SELECT id,canonical_name AS label,kind AS type,resolution_confidence FROM entities WHERE node_id=$1 AND id=ANY($2::uuid[]) ORDER BY canonical_name`,[node_id,ids]):{rows:[]};return {nodes:entities.rows,edges:edges.rows};
  }));
}
