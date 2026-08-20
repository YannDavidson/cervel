import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { CloudSyncEngine,type SyncDevice,type SyncPersistence } from "../../../packages/cloud-sync/src/engine";
import { createEnrollmentBundle,generateDeviceIdentity,openEnrollmentBundle,randomId } from "../../../packages/cloud-sync/src/crypto";
import { HttpSyncRelay } from "../../../packages/cloud-sync/src/http";
import type { DeviceRegistration,EnrollmentBundle } from "../../../packages/cloud-sync/src/protocol";
import { atomicWrite,decryptBuffer,encryptBuffer,unlockVault } from "./vault";

type SyncConfig={format:"cervel-cloud-sync/v0.1";relay_url:string;vault_id:string;root_key:string;device:SyncDevice;enabled_at:string};
type PendingEnrollment={device:SyncDevice;created_at:string};
const configPath=(root:string)=>join(root,"private","cloud-sync.cvlt"),statePath=(root:string)=>join(root,"private","cloud-sync-state.cvlt"),pendingPath=(root:string)=>join(root,"private","cloud-sync-enrollment.cvlt");

export class LocalCloudSyncController{
  private constructor(private readonly root:string,private readonly artifactKey:Buffer,private config:SyncConfig,private engine:CloudSyncEngine){}
  static async enable(root:string,passphrase:string,relayUrl:string){const unlocked=await unlockVault(root,passphrase),relay=new HttpSyncRelay(relayUrl),device=generateDeviceIdentity(),config:SyncConfig={format:"cervel-cloud-sync/v0.1",relay_url:relayUrl,vault_id:randomId(24),root_key:randomBytes(32).toString("base64url"),device,enabled_at:new Date().toISOString()},engine=new CloudSyncEngine(config.vault_id,Buffer.from(config.root_key,"base64url"),device,relay);await engine.register();const controller=new LocalCloudSyncController(root,unlocked.artifactKey,config,engine);await controller.persist();return controller;}
  static async load(root:string,passphrase:string){const unlocked=await unlockVault(root,passphrase),config=JSON.parse(decryptBuffer(await readFile(configPath(root)),unlocked.artifactKey).toString("utf8")) as SyncConfig;if(config.format!=="cervel-cloud-sync/v0.1")throw new Error("SYNC_CONFIG_VERSION_UNSUPPORTED");let persisted:SyncPersistence|undefined;try{persisted=JSON.parse(decryptBuffer(await readFile(statePath(root)),unlocked.artifactKey).toString("utf8"));}catch{}const engine=new CloudSyncEngine(config.vault_id,Buffer.from(config.root_key,"base64url"),config.device,new HttpSyncRelay(config.relay_url),persisted);return new LocalCloudSyncController(root,unlocked.artifactKey,config,engine);}
  private async persist(){await atomicWrite(configPath(this.root),encryptBuffer(Buffer.from(JSON.stringify(this.config)),this.artifactKey));await atomicWrite(statePath(this.root),encryptBuffer(Buffer.from(JSON.stringify(this.engine.persistence())),this.artifactKey));}
  async sync(){const result=await this.engine.sync();await this.persist();return result;}
  async pause(value=true){this.engine.pause(value);await this.persist();return this.status();}
  async reset(){await this.engine.reset();await this.persist();return this.sync();}
  async backup(){this.engine.createRemoteBackup();const result=await this.sync();return {...result,backup:true};}
  async revoke(deviceId:string){await this.engine.revokeDevice(deviceId);return {ok:true,revoked:deviceId};}
  async deleteRemote(confirmVaultId:string){if(confirmVaultId!==this.config.vault_id)throw new Error("SYNC_DELETE_CONFIRMATION_MISMATCH");await this.engine.deleteRemote();await this.persist();return {ok:true,deleted:true};}
  journal(entityId:string,entityType:string,value:unknown){const envelope=this.engine.put(entityId,entityType,value);return this.persist().then(()=>({record_id:envelope.record_id,offline:true}));}
  status(){return {enabled:true,relay_url:new URL(this.config.relay_url).origin,vault_id:this.config.vault_id,device_id:this.config.device.registration.device_id,...this.engine.state()};}
  async approveEnrollment(registration:DeviceRegistration){await this.engine.enrollDevice(registration);const bundle=createEnrollmentBundle(Buffer.from(this.config.root_key,"base64url"),this.config.vault_id,registration);return bundle;}
  static async createEnrollmentRequest(root:string,passphrase:string){const unlocked=await unlockVault(root,passphrase),device=generateDeviceIdentity(),pending:PendingEnrollment={device,created_at:new Date().toISOString()};await atomicWrite(pendingPath(root),encryptBuffer(Buffer.from(JSON.stringify(pending)),unlocked.artifactKey));return device.registration;}
  static async acceptEnrollment(root:string,passphrase:string,relayUrl:string,bundle:EnrollmentBundle){const unlocked=await unlockVault(root,passphrase),pending=JSON.parse(decryptBuffer(await readFile(pendingPath(root)),unlocked.artifactKey).toString("utf8")) as PendingEnrollment;if(pending.device.registration.device_id!==bundle.device_id)throw new Error("ENROLLMENT_DEVICE_MISMATCH");const rootKey=openEnrollmentBundle(bundle,pending.device.encryption_private_key),config:SyncConfig={format:"cervel-cloud-sync/v0.1",relay_url:relayUrl,vault_id:bundle.vault_id,root_key:rootKey.toString("base64url"),device:pending.device,enabled_at:new Date().toISOString()},engine=new CloudSyncEngine(bundle.vault_id,rootKey,pending.device,new HttpSyncRelay(relayUrl)),controller=new LocalCloudSyncController(root,unlocked.artifactKey,config,engine);await controller.persist();return controller.sync();}
}
