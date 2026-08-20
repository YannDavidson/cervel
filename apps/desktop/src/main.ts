import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, session, shell, Tray } from "electron";
import { autoUpdater } from "electron-updater";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { LocalNodeClient, discoverVaults, type ProviderConfiguration } from "./node-client";

let window:BrowserWindow|null=null,tray:Tray|null=null,quitting=false,restartFailures=0,restartTimer:NodeJS.Timeout|null=null,updateTimer:NodeJS.Timeout|null=null;
const appRoot=app.isPackaged?app.getAppPath():resolve(__dirname,"../../../..");
const rendererRoot=join(appRoot,"apps/desktop/renderer");
const nodeClient=new LocalNodeClient(appRoot);
const send=(channel:string,value:any)=>window?.webContents.send(channel,value);

function createWindow():void{
  window=new BrowserWindow({width:1440,height:920,minWidth:1040,minHeight:700,show:false,title:"CERVEL",backgroundColor:"#090c0b",webPreferences:{preload:join(__dirname,"preload.js"),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:true}});
  window.loadFile(join(rendererRoot,"index.html"));window.once("ready-to-show",()=>window?.show());
  window.on("close",event=>{if(!quitting){event.preventDefault();window?.hide();}});
  window.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//.test(url))void shell.openExternal(url);return {action:"deny"};});
  window.webContents.on("will-navigate",event=>event.preventDefault());
}

function createTray():void{const icon=nativeImage.createFromPath(join(rendererRoot,"tray.svg"));tray=new Tray(icon);tray.setToolTip("CERVEL Local Node");tray.setContextMenu(Menu.buildFromTemplate([{label:"Open CERVEL",click:()=>{window?.show();window?.focus();}},{label:"Node status",click:async()=>send("node:status-changed",await nodeClient.status())},{type:"separator"},{label:"Lock Vault",click:async()=>{await nodeClient.lock();send("node:status-changed",{open:false,running:false});}},{label:"Quit",click:()=>{quitting=true;app.quit();}}]));tray.on("double-click",()=>window?.show());}

function registerIpc():void{
  ipcMain.handle("vault:discover",()=>discoverVaults(homedir()));
  ipcMain.handle("vault:create",async(_,{path,name,authority,passphrase})=>nodeClient.create(path||join(homedir(),".cervel","vaults",authority),name,authority,passphrase));
  ipcMain.handle("vault:open",async(_,{path,passphrase})=>nodeClient.open(path,passphrase));
  ipcMain.handle("vault:lock",async()=>nodeClient.lock());ipcMain.handle("vault:verify",()=>nodeClient.operation("vault-verify"));ipcMain.handle("vault:backup",()=>nodeClient.operation("backup"));
  ipcMain.handle("vault:restore",async()=>{const result=await dialog.showOpenDialog({properties:["openFile"],filters:[{name:"CERVEL Backup",extensions:["cvbackup"]}]});if(result.canceled)return null;return nodeClient.operation("restore",result.filePaths[0]);});
  ipcMain.handle("node:status",()=>nodeClient.status());ipcMain.handle("node:overview",()=>nodeClient.overview());ipcMain.handle("node:objects",(_,input)=>nodeClient.listObjects(input.type,input.q));ipcMain.handle("node:search",(_,query)=>nodeClient.search(query));ipcMain.handle("node:ask",(_,query)=>nodeClient.ask(query));ipcMain.handle("node:trace",(_,id)=>nodeClient.trace(id));ipcMain.handle("node:graph",()=>nodeClient.graph());ipcMain.handle("node:create-note",(_,input)=>nodeClient.createNote(input.title,input.content));ipcMain.handle("node:ingest",async(_,paths:string[])=>Promise.all(paths.map(path=>nodeClient.ingestFile(path))));
  ipcMain.handle("node:choose-files",async()=>{const result=await dialog.showOpenDialog({properties:["openFile","multiSelections"]});if(result.canceled)return [];await Promise.all(result.filePaths.map(path=>nodeClient.ingestFile(path)));return result.filePaths;});
  ipcMain.handle("config:get",()=>nodeClient.getProviderConfiguration());ipcMain.handle("config:save",(_,input:ProviderConfiguration)=>nodeClient.setProviderConfiguration(input));ipcMain.handle("app:version",()=>app.getVersion());ipcMain.handle("app:show",()=>window?.show());
}

function supervise():void{restartTimer=setInterval(async()=>{if(!nodeClient.isOpen)return;const healthy=await nodeClient.healthy();if(healthy){restartFailures=0;return;}restartFailures++;send("node:status-changed",{open:true,healthy:false,restarting:true,attempt:restartFailures});if(restartFailures>=2){try{await nodeClient.ensureStarted();restartFailures=0;send("node:status-changed",await nodeClient.status());}catch(error){send("node:status-changed",{open:true,healthy:false,error:error instanceof Error?error.message:String(error)});}}},5000);}

if(!app.requestSingleInstanceLock())app.quit();else{
  app.on("second-instance",()=>{window?.show();window?.focus();});
  app.whenReady().then(()=>{session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));registerIpc();createWindow();createTray();supervise();if(app.isPackaged){autoUpdater.autoDownload=true;autoUpdater.autoInstallOnAppQuit=true;autoUpdater.on("update-downloaded",info=>send("node:status-changed",{healthy:true,update_ready:info.version}));void autoUpdater.checkForUpdates().catch(()=>undefined);updateTimer=setInterval(()=>void autoUpdater.checkForUpdates().catch(()=>undefined),6*60*60*1000);}});
  app.on("activate",()=>window?.show());app.on("before-quit",()=>{quitting=true;if(restartTimer)clearInterval(restartTimer);if(updateTimer)clearInterval(updateTimer);});
}
