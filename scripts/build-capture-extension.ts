import { cp,mkdir,readFile,writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const source=resolve("apps/capture-extension/src"),output=resolve("dist/extensions");
async function build(){await mkdir(output,{recursive:true});for(const browser of ["chromium","firefox"]){const target=resolve(output,browser);await cp(source,target,{recursive:true,force:true});if(browser==="firefox"){const manifest=JSON.parse(await readFile(resolve(target,"manifest.json"),"utf8"));manifest.browser_specific_settings={gecko:{id:"capture@cervel.ai",strict_min_version:"121.0"}};await writeFile(resolve(target,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");}}console.log(JSON.stringify({ok:true,chromium:resolve(output,"chromium"),firefox:resolve(output,"firefox"),safari_command:`xcrun safari-web-extension-converter ${resolve(output,"chromium")} --project-location ${resolve(output,"safari")}`}));}
build().catch(error=>{console.error(error);process.exit(1);});
