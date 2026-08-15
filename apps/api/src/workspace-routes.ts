import type { FastifyInstance, FastifyRequest } from "fastify";
import { withTransaction } from "./db";
import { assembleContextPackage } from "./context";
import { executeSemanticKnowledgeReasoning } from "./semantic-reasoning";
import { createWorkspaceSession, resolveWorkspaceSession, revokeWorkspaceSession, workspaceBootstrap, listWorkspaceObjects, loadWorkspaceObject, listSemanticEntities, loadSemanticEntity, loadGraph } from "./workspace";
import { renderWorkspaceAlpha } from "../../web/src/workspace-ui";

function bearer(request: FastifyRequest): string {
  const raw=request.headers.authorization;
  if(!raw?.startsWith("Bearer ")) throw Object.assign(new Error("WORKSPACE_SESSION_REQUIRED"),{statusCode:401});
  return raw.slice(7);
}
async function session(request:FastifyRequest){const token=bearer(request);return withTransaction(client=>resolveWorkspaceSession(client,token));}

export function registerWorkspaceRoutes(app:FastifyInstance){
  app.get("/workspace",async(_request,reply)=>reply.type("text/html; charset=utf-8").send(renderWorkspaceAlpha()));
  app.post("/v1/session",async(request,reply)=>{const body=request.body as {node_id?:string;principal_id?:string;workspace_id?:string|null};if(!body?.node_id||!body?.principal_id)return reply.code(400).send({error:"NODE_AND_PRINCIPAL_REQUIRED"});const result=await withTransaction(client=>createWorkspaceSession(client,{nodeId:body.node_id!,principalId:body.principal_id!,workspaceId:body.workspace_id??null}));return reply.code(201).send(result);});
  app.delete("/v1/session",async(request,reply)=>{const token=bearer(request);await withTransaction(client=>revokeWorkspaceSession(client,token));return reply.code(204).send();});
  app.get("/v1/workspace",async(request,reply)=>{const s=await session(request);return reply.send(await withTransaction(client=>workspaceBootstrap(client,s)));});
  app.get("/v1/workspace/objects",async(request,reply)=>{const s=await session(request);const {q}=request.query as {q?:string};return reply.send(await withTransaction(client=>listWorkspaceObjects(client,s,q)));});
  app.get("/v1/workspace/objects/:id",async(request,reply)=>{const s=await session(request);const {id}=request.params as {id:string};return reply.send(await withTransaction(client=>loadWorkspaceObject(client,s,id)));});
  app.get("/v1/workspace/entities",async(request,reply)=>{const s=await session(request);const {q}=request.query as {q?:string};return reply.send(await withTransaction(client=>listSemanticEntities(client,s,q)));});
  app.get("/v1/workspace/entities/:id",async(request,reply)=>{const s=await session(request);const {id}=request.params as {id:string};return reply.send(await withTransaction(client=>loadSemanticEntity(client,s,id)));});
  app.get("/v1/workspace/graph",async(request,reply)=>{const s=await session(request);const {entity_id}=request.query as {entity_id?:string};return reply.send(await withTransaction(client=>loadGraph(client,s,entity_id)));});
  app.post("/v1/workspace/ask",async(request,reply)=>{const s=await session(request);const body=request.body as {query?:string;library_ids?:string[];as_of?:string};if(!body?.query?.trim())return reply.code(400).send({error:"QUERY_REQUIRED"});const result=await withTransaction(async client=>{const ccp=await assembleContextPackage(client,{nodeId:String(s.node_id),workspaceId:s.workspace_id?String(s.workspace_id):null,principalId:String(s.principal_id),query:body.query!.trim(),asOf:body.as_of??null,libraryIds:body.library_ids??[]});return executeSemanticKnowledgeReasoning(client,ccp.id,String(s.principal_id));});return reply.code(201).send(result);});
}
