import { readFileSync, existsSync } from "node:fs";
const must=(ok:boolean,msg:string)=>{if(!ok)throw new Error(msg)};
const root="apps/desktop-tauri";
for(const p of ["src-tauri/Cargo.toml","src-tauri/tauri.conf.json","src-tauri/src/lib.rs","ui/index.html","ui/styles.css","ui/app.js"])must(existsSync(`${root}/${p}`),`missing ${p}`);
const cargo=readFileSync(`${root}/src-tauri/Cargo.toml`,"utf8");const rust=readFileSync(`${root}/src-tauri/src/lib.rs`,"utf8");const html=readFileSync(`${root}/ui/index.html`,"utf8");const conf=JSON.parse(readFileSync(`${root}/src-tauri/tauri.conf.json`,"utf8"));
must(cargo.includes('tauri = { version = "2"'),"Tauri v2 required");must(conf.identifier==="ai.cervel.desktop","stable desktop identity required");must(conf.bundle.targets.includes("dmg"),"macOS DMG target required");must(rust.includes("start_local_node")&&rust.includes("stop_local_node"),"Local Node lifecycle required");must(rust.includes("TrayIconBuilder"),"system tray required");
for(const label of ["Vault","Corpus Explorer","Search","Knowledge Graph","Capture","Cortex","Trace","Models","Connections"])must(html.includes(label),`missing ${label}`);
must(html.includes("Knowledge stays here. Reasoning may happen there."),"sovereignty boundary required");
console.log("CERVEL Desktop Shell v1 contract: OK");
