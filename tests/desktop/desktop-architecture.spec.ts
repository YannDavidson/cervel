import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OpenAICompatibleAdapter } from "../../apps/api/src/model-adapters";

const root=process.cwd(),main=readFileSync(join(root,"apps/desktop/src/main.ts"),"utf8"),preload=readFileSync(join(root,"apps/desktop/src/preload.ts"),"utf8"),client=readFileSync(join(root,"apps/desktop/src/node-client.ts"),"utf8"),server=readFileSync(join(root,"apps/api/src/server.ts"),"utf8");

describe("CERVEL Desktop architecture boundary",()=>{
  test("renderer is isolated and all knowledge operations use the Local Node client",()=>{expect(main).toContain("contextIsolation:true");expect(main).toContain("nodeIntegration:false");expect(main).toContain("sandbox:true");expect(client).toContain("fetch(`${this.url}${path}`");expect(client).not.toContain('from "pg"');});
  test("local token is never bridged to the renderer",()=>{expect(preload).not.toContain("local_api_token");expect(preload).not.toContain("passphrase:");expect(client).toContain('"x-cervel-local-token":this.unlocked.secrets.local_api_token');});
  test("local-only API routes cannot register in managed deployments",()=>{expect(server).toContain('if(process.env.CERVEL_RUNTIME_MODE==="local")registerLocalNodeRoutes(app)');});
  test("crash supervision and deny-by-default permissions are enabled",()=>{expect(main).toContain("setPermissionRequestHandler");expect(main).toContain("nodeClient.ensureStarted()");expect(main).toContain("requestSingleInstanceLock");});
  test("compatible model adapters fail closed for remote endpoints",async()=>{const adapter=new OpenAICompatibleAdapter("https://models.example/v1","secret","model",false);await expect(adapter.execute({query:"q",evidence:[],contested:false})).rejects.toThrow("MODEL_NETWORK_PERMISSION_REQUIRED");});
});
