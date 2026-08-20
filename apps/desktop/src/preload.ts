import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("cervel",{
  vault:{discover:()=>ipcRenderer.invoke("vault:discover"),create:(input:any)=>ipcRenderer.invoke("vault:create",input),open:(input:any)=>ipcRenderer.invoke("vault:open",input),lock:()=>ipcRenderer.invoke("vault:lock"),verify:()=>ipcRenderer.invoke("vault:verify"),backup:()=>ipcRenderer.invoke("vault:backup"),restore:()=>ipcRenderer.invoke("vault:restore")},
  node:{status:()=>ipcRenderer.invoke("node:status"),overview:()=>ipcRenderer.invoke("node:overview"),objects:(type?:string,q?:string)=>ipcRenderer.invoke("node:objects",{type,q}),search:(query:string)=>ipcRenderer.invoke("node:search",query),ask:(query:string)=>ipcRenderer.invoke("node:ask",query),trace:(id:string)=>ipcRenderer.invoke("node:trace",id),graph:()=>ipcRenderer.invoke("node:graph"),createNote:(input:any)=>ipcRenderer.invoke("node:create-note",input),ingest:(paths:string[])=>ipcRenderer.invoke("node:ingest",paths),chooseFiles:()=>ipcRenderer.invoke("node:choose-files")},
  config:{get:()=>ipcRenderer.invoke("config:get"),save:(input:any)=>ipcRenderer.invoke("config:save",input)},
  sync:{action:(action:string,input?:any)=>ipcRenderer.invoke("sync:action",{action,input})},
  mobile:{device:(action:"enroll"|"revoke",input:any)=>ipcRenderer.invoke("mobile:device",{action,input})},
  app:{version:()=>ipcRenderer.invoke("app:version"),show:()=>ipcRenderer.invoke("app:show"),onStatus:(callback:(value:any)=>void)=>{const listener=(_:unknown,value:any)=>callback(value);ipcRenderer.on("node:status-changed",listener);return()=>ipcRenderer.removeListener("node:status-changed",listener);}},
  files:{paths:(files:File[])=>files.map(file=>webUtils.getPathForFile(file)).filter(Boolean)}
});
