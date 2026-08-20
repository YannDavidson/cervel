import Fastify,{type FastifyRequest} from "fastify";
import { Pool } from "pg";
import { PostgresZeroKnowledgeRelay } from "./postgres-relay";
import type { SignedRequest } from "../../../packages/cloud-sync/src/protocol";

const app=Fastify({logger:true,bodyLimit:6*1024*1024}),pool=new Pool({connectionString:process.env.DATABASE_URL}),relay=new PostgresZeroKnowledgeRelay(pool);
function proof(request:FastifyRequest):SignedRequest{return {device_id:String(request.headers["x-cervel-device"]??""),timestamp:String(request.headers["x-cervel-timestamp"]??""),nonce:String(request.headers["x-cervel-nonce"]??""),body_sha256:String(request.headers["x-cervel-body-sha256"]??""),signature:String(request.headers["x-cervel-signature"]??"")};}
app.get("/live",async()=>({ok:true,service:"cervel-sync-relay"}));app.get("/ready",async()=>{await pool.query("SELECT 1");return {ok:true};});
app.post("/v1/sync/vaults/:vault",async(request,reply)=>{const {vault}=request.params as any;await relay.registerVault(vault,request.body as any,proof(request));return reply.code(201).send({ok:true});});
app.post("/v1/sync/vaults/:vault/devices",async(request,reply)=>{const {vault}=request.params as any;await relay.enrollDevice(vault,request.body as any,proof(request));return reply.code(201).send({ok:true});});
app.delete("/v1/sync/vaults/:vault/devices/:device",async(request,reply)=>{const {vault,device}=request.params as any;await relay.revokeDevice(vault,device,proof(request));return reply.code(204).send();});
app.post("/v1/sync/vaults/:vault/records",async(request)=>{const {vault}=request.params as any;return relay.push(vault,(request.body as any).envelopes,proof(request));});
app.get("/v1/sync/vaults/:vault/records",async(request)=>{const {vault}=request.params as any,{after,limit}=request.query as any;return relay.pull(vault,Number(after??0),Number(limit??200),proof(request));});
app.post("/v1/sync/vaults/:vault/chunks/missing",async(request)=>{const {vault}=request.params as any;return {missing:await relay.missingChunks(vault,(request.body as any).ids,proof(request))};});
app.put("/v1/sync/vaults/:vault/chunks/:chunk",async(request)=>{const {vault}=request.params as any,body=request.body as any;return relay.putChunkPart(vault,body.meta,body.offset,body.ciphertext_part,body.final,proof(request));});
app.get("/v1/sync/vaults/:vault/chunks/:chunk",async(request)=>{const {vault,chunk}=request.params as any;return relay.getChunk(vault,chunk,proof(request));});
app.post("/v1/sync/vaults/:vault/reset",async(request,reply)=>{const {vault}=request.params as any;await relay.resetDevice(vault,proof(request));return reply.code(204).send();});
app.delete("/v1/sync/vaults/:vault",async(request,reply)=>{const {vault}=request.params as any;await relay.deleteVault(vault,proof(request));return reply.code(204).send();});
app.setErrorHandler((error,_request,reply)=>{const message=error instanceof Error?error.message:String(error),status=message.includes("SIGNATURE")||message.includes("REPLAY")||message.includes("REVOKED")?401:message.includes("NOT_FOUND")?404:400;reply.code(status).send({error:message});});
const port=Number(process.env.PORT??8080);app.listen({host:"0.0.0.0",port}).catch(async error=>{app.log.error(error);await pool.end();process.exit(1);});
