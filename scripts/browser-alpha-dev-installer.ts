import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { unlockVault, vaultPath } from "../apps/local-node/src/vault";

const HOST_NAME = "ai.cervel.capture";
const EXTENSION_ID = "ljaccdmbcojoogpmgkmglchlnhogiomf";
const args = process.argv.slice(2);
const option = (name:string) => { const i=args.indexOf(name); return i>=0 ? args[i+1] : undefined; };
const has = (name:string) => args.includes(name);
const vault = vaultPath(option("--vault"));
const browser = option("--browser") ?? "chrome";
const passphrase = process.env.CERVEL_VAULT_PASSPHRASE;

function run(command:string, argv:string[], env:NodeJS.ProcessEnv=process.env) {
  const result=spawnSync(command,argv,{stdio:"inherit",env});
  if(result.status!==0) throw new Error(`${command} failed with exit code ${result.status}`);
}
async function exists(path:string){return stat(path).then(()=>true).catch(()=>false);}
function npmCommand(){return platform()==="win32"?"npm.cmd":"npm";}

async function prepareVault(){
  if(!passphrase) throw new Error("Set CERVEL_VAULT_PASSPHRASE (12+ characters) before running the developer installer.");
  if(!(await exists(join(vault,"vault.json")))) {
    run(npmCommand(),["run","--silent","cervel","--","init","--vault",vault,"--name","My CERVEL Vault","--authority","local-dev"]);
  }
  run(npmCommand(),["run","--silent","cervel","--","start","--vault",vault]);
}

async function writeHostConfig(){
  const {secrets}=await unlockVault(vault,passphrase!);
  const bootstrap=JSON.parse(await readFile(join(vault,"runtime","bootstrap.json"),"utf8"));
  const config={format:"cervel-capture-host/v0.1",vault:"default",local_node_url:option("--node-url")??"http://127.0.0.1:8787",local_api_token:secrets.local_api_token,node_id:bootstrap.nodeId,workspace_id:bootstrap.workspaceId,principal_id:bootstrap.principalId,storage_location_id:bootstrap.storageLocationId};
  const configDir=join(homedir(),".cervel","native-hosts");
  await mkdir(configDir,{recursive:true,mode:0o700});
  await writeFile(join(configDir,"default.json"),JSON.stringify(config,null,2)+"\n",{mode:0o600});
  return configDir;
}

async function launcher(configDir:string){
  const host=resolve("dist/apps/capture-native-host/src/host.js");
  if(!(await exists(host))) throw new Error("Compiled capture native host is missing. Run npm run build.");
  const path=join(configDir,"ai.cervel.capture-host");
  await writeFile(path,`#!/bin/sh\nexec "${process.execPath}" "${host}"\n`,{mode:0o700});
  await chmod(path,0o700);
  return path;
}

function manifestFor(path:string){return {name:HOST_NAME,description:"CERVEL Local Node capture bridge (developer)",path,type:"stdio",allowed_origins:[`chrome-extension://${EXTENSION_ID}/`]};}
async function writeManifest(target:string,hostPath:string){await mkdir(dirname(target),{recursive:true});await writeFile(target,JSON.stringify(manifestFor(hostPath),null,2)+"\n",{mode:0o600});}

async function registerPosix(hostPath:string){
  const home=homedir();
  const targets = platform()==="darwin" ? {
    chrome:join(home,"Library/Application Support/Google/Chrome/NativeMessagingHosts",`${HOST_NAME}.json`),
    edge:join(home,"Library/Application Support/Microsoft Edge/NativeMessagingHosts",`${HOST_NAME}.json`)
  } : {
    chrome:join(home,".config/google-chrome/NativeMessagingHosts",`${HOST_NAME}.json`),
    edge:join(home,".config/microsoft-edge/NativeMessagingHosts",`${HOST_NAME}.json`)
  };
  if(browser==="both") { await writeManifest(targets.chrome,hostPath); await writeManifest(targets.edge,hostPath); return [targets.chrome,targets.edge]; }
  if(browser!=="chrome"&&browser!=="edge") throw new Error("--browser must be chrome, edge, or both");
  await writeManifest(targets[browser as "chrome"|"edge"],hostPath); return [targets[browser as "chrome"|"edge"]];
}

async function main(){
  console.log("CERVEL Browser Alpha developer setup");
  if(platform()==="win32") throw new Error("Windows native-host developer registration is not supported by this alpha installer yet. Use macOS/Linux for PR #57.1; Windows will use the packaged Desktop executable host path.");
  run(npmCommand(),["run","build"]);
  run(npmCommand(),["run","build:capture-extension"]);
  if(!has("--no-node")) await prepareVault();
  if(!passphrase) throw new Error("CERVEL_VAULT_PASSPHRASE is required to provision the native bridge.");
  const configDir=await writeHostConfig(), hostPath=await launcher(configDir);
  const registrations=await registerPosix(hostPath);
  const extensionDir=resolve(browser==="edge"?"dist/extensions/edge":"dist/extensions/chromium");
  console.log(JSON.stringify({ok:true,browser,extension_id:EXTENSION_ID,extension_dir:extensionDir,native_host:hostPath,registrations,node:"http://127.0.0.1:8787",next:browser==="edge"?"Open edge://extensions, enable Developer mode, Load unpacked, and choose extension_dir.":"Open chrome://extensions, enable Developer mode, Load unpacked, and choose extension_dir."},null,2));
}
main().catch(error=>{console.error(`CERVEL developer installer: ${error instanceof Error?error.message:String(error)}`);process.exit(1);});
