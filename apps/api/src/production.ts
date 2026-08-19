import type { FastifyInstance } from "fastify";
import { db } from "./db";

export type RuntimeMode = "development" | "test" | "staging" | "production";

export function runtimeMode(): RuntimeMode {
  const raw=(process.env.CERVEL_RUNTIME_MODE??process.env.NODE_ENV??"development").toLowerCase();
  return raw==="production"?"production":raw==="staging"?"staging":raw==="test"?"test":"development";
}

export function assertProductionConfiguration(): void {
  const mode=runtimeMode();
  if(mode!=="production"&&mode!=="staging")return;
  const required=["DATABASE_URL","S3_ENDPOINT","S3_REGION","S3_BUCKET","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY","CERVEL_CONNECTOR_TOKEN_KEY","CERVEL_AUTOMATION_KEY","CERVEL_NODE_AUTHORITY"];
  const missing=required.filter(name=>!process.env[name]?.trim());
  if(missing.length)throw new Error(`PRODUCTION_CONFIG_MISSING:${missing.join(",")}`);
  if(process.env.CERVEL_ALLOW_ALPHA_LOGIN==="true")throw new Error("ALPHA_LOGIN_FORBIDDEN_IN_MANAGED_RUNTIME");
  if(process.env.CERVEL_TRUST_PRINCIPAL_HEADER==="true")throw new Error("PRINCIPAL_HEADER_TRUST_FORBIDDEN_IN_MANAGED_RUNTIME");
  const insecure=["change-me-now","replace-with-secret-key-material","replace-with-internal-scheduler-secret"];
  for(const name of required){if(insecure.includes(process.env[name]??""))throw new Error(`INSECURE_PRODUCTION_SECRET:${name}`);}
}

export async function readiness(){
  const started=Date.now();
  await db.query("SELECT 1");
  return {ok:true,service:"cervel",database:true,latency_ms:Date.now()-started,mode:runtimeMode()};
}

export function registerProductionLifecycle(app:FastifyInstance){
  let draining=false;
  app.get("/live",async()=>({ok:true,service:"cervel",draining}));
  app.get("/ready",async(_request,reply)=>{if(draining)return reply.code(503).send({ok:false,draining:true});try{return reply.send(await readiness());}catch{return reply.code(503).send({ok:false,database:false});}});
  const shutdown=async(signal:string)=>{if(draining)return;draining=true;app.log.info({signal},"graceful shutdown started");try{await app.close();await db.end();process.exit(0);}catch(error){app.log.error(error,"graceful shutdown failed");process.exit(1);}};
  process.once("SIGTERM",()=>void shutdown("SIGTERM"));
  process.once("SIGINT",()=>void shutdown("SIGINT"));
}
