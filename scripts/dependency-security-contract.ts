import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));

function fail(message:string):never { throw new Error(message); }
function must(ok:boolean,message:string){ if(!ok) fail(message); }

const overrides = pkg.overrides ?? {};
must(overrides["fast-uri"] === "4.1.5", "fast-uri override must pin 4.1.5");
must(overrides["js-yaml"] === "4.3.2", "js-yaml override must pin 4.3.2");
must(overrides["@xmldom/xmldom"] === "0.8.15", "@xmldom/xmldom override must pin 0.8.15");

const packages = lock.packages ?? {};
const vulnerable = [
  ["fast-uri", new Set(["3.1.5","4.1.2"])],
  ["js-yaml", new Set(["3.15.1","4.3.1"])],
  ["@xmldom/xmldom", new Set(["0.8.14"])],
] as const;

for (const [name, versions] of vulnerable) {
  for (const [path, meta] of Object.entries<any>(packages)) {
    if (!path.endsWith(`node_modules/${name}`)) continue;
    must(!versions.has(meta.version), `${path} remains on vulnerable ${name}@${meta.version}`);
  }
}

console.log("Dependency security contract PASS");
