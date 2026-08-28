import { cp,mkdir,readFile,writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const source=resolve("apps/capture-extension/src"),output=resolve("dist/extensions");
const DEV_PUBLIC_KEY="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxj7qJQLNCUXiJLPEqbfNiY2Z/aFw8xeVP8E0NH67hhDONzIK1b99CbMP2NaRkrLGJmGN72MkFAaOEDJH1oL1aKnJwu8iHO2jkbW6cx/S4Euq9o+CFCSZ94AiJPVv312kLJoHh5tqWuiuwrPIm+038XQwYhr0Yk0CEGaYZSbjqmftpYJNx7o3Wr1SHRxEUF0yipayWSS1xd7UWY+qN5hy3KoSggk/0kEoCeJEIdUbNZqXEy7FawcHoWlSWRgVterFPONQYw4zKIzTTVPW9akUEqEKrgLe8DkICGF3gWCFrlP945cXZLTxvQ1LomTqFkwuLEyMEX5dqsqqbtQ6GVkF3wIDAQAB";

async function build(){
  await mkdir(output,{recursive:true});
  for(const browser of ["chromium","edge","firefox"]){
    const target=resolve(output,browser);
    await cp(source,target,{recursive:true,force:true});
    const manifest=JSON.parse(await readFile(resolve(target,"manifest.json"),"utf8"));
    if(browser==="chromium"||browser==="edge")manifest.key=DEV_PUBLIC_KEY;
    if(browser==="edge")manifest.name="CERVEL Capture for Edge";
    if(browser==="firefox")manifest.browser_specific_settings={gecko:{id:"capture@cervel.ai",strict_min_version:"121.0"}};
    await writeFile(resolve(target,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
  }
  console.log(JSON.stringify({ok:true,chrome:resolve(output,"chromium"),edge:resolve(output,"edge"),firefox:resolve(output,"firefox"),safari_command:`xcrun safari-web-extension-converter ${resolve(output,"chromium")} --project-location ${resolve(output,"safari")}`}));
}
build().catch(error=>{console.error(error);process.exit(1);});
