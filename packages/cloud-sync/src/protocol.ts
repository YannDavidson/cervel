export const SYNC_PROTOCOL="cervel-sync/v0.1" as const;
export type VersionVector=Record<string,number>;
export type EncryptedEnvelope={protocol:typeof SYNC_PROTOCOL;record_id:string;vault_id:string;device_id:string;entity_id:string;counter:number;vector:VersionVector;nonce:string;ciphertext:string;tag:string;created_at:string};
export type EncryptedChunk={chunk_id:string;nonce:string;ciphertext:string;tag:string;size:number};
export type RelayRecord={sequence:number;envelope:EncryptedEnvelope};
export type DeviceRegistration={device_id:string;signing_public_key:string;encryption_public_key:string;enrolled_at:string;revoked_at?:string};
export type SignedRequest={device_id:string;timestamp:string;nonce:string;body_sha256:string;signature:string};
export type EnrollmentBundle={protocol:typeof SYNC_PROTOCOL;vault_id:string;device_id:string;ephemeral_public_key:string;nonce:string;ciphertext:string;tag:string;issued_at:string;expires_at:string};

export function compareVectors(a:VersionVector,b:VersionVector):"equal"|"before"|"after"|"concurrent"{let less=false,greater=false;for(const key of new Set([...Object.keys(a),...Object.keys(b)])){const av=a[key]??0,bv=b[key]??0;if(av<bv)less=true;if(av>bv)greater=true;}if(less&&greater)return "concurrent";if(less)return "before";if(greater)return "after";return "equal";}
export function mergeVectors(a:VersionVector,b:VersionVector):VersionVector{const result:VersionVector={};for(const key of new Set([...Object.keys(a),...Object.keys(b)]))result[key]=Math.max(a[key]??0,b[key]??0);return result;}
export function deterministicWinner(a:{record_id:string},b:{record_id:string}){return a.record_id.localeCompare(b.record_id)>=0?a:b;}
export function validateEnvelope(envelope:EncryptedEnvelope):void{if(envelope.protocol!==SYNC_PROTOCOL)throw new Error("SYNC_PROTOCOL_UNSUPPORTED");if(!/^[A-Za-z0-9_-]{20,100}$/.test(envelope.record_id)||!/^[A-Za-z0-9_-]{20,100}$/.test(envelope.entity_id))throw new Error("SYNC_OPAQUE_ID_INVALID");if(!Number.isSafeInteger(envelope.counter)||envelope.counter<1)throw new Error("SYNC_COUNTER_INVALID");if(Object.keys(envelope.vector).length>64||Object.values(envelope.vector).some(value=>!Number.isSafeInteger(value)||value<0))throw new Error("SYNC_VECTOR_INVALID");if(Buffer.from(envelope.ciphertext,"base64url").length>6*1024*1024)throw new Error("SYNC_ENVELOPE_TOO_LARGE");}
export function validateChunkMeta(meta:Omit<EncryptedChunk,"ciphertext">):void{if(!/^[A-Za-z0-9_-]{20,100}$/.test(meta.chunk_id)||!Number.isSafeInteger(meta.size)||meta.size<0||meta.size>16*1024*1024)throw new Error("SYNC_CHUNK_META_INVALID");}

export interface SyncRelayTransport{
  registerVault(vaultId:string,device:DeviceRegistration,proof:SignedRequest):Promise<void>;
  enrollDevice(vaultId:string,device:DeviceRegistration,authorizer:SignedRequest):Promise<void>;
  revokeDevice(vaultId:string,deviceId:string,authorizer:SignedRequest):Promise<void>;
  push(vaultId:string,envelopes:EncryptedEnvelope[],proof:SignedRequest):Promise<{accepted:string[]}>;
  pull(vaultId:string,after:number,limit:number,proof:SignedRequest):Promise<{records:RelayRecord[];cursor:number}>;
  missingChunks(vaultId:string,ids:string[],proof:SignedRequest):Promise<string[]>;
  putChunkPart(vaultId:string,chunk:Omit<EncryptedChunk,"ciphertext">,offset:number,ciphertext_part:string,final:boolean,proof:SignedRequest):Promise<{complete:boolean;received:number}>;
  getChunk(vaultId:string,id:string,proof:SignedRequest):Promise<EncryptedChunk>;
  resetDevice(vaultId:string,proof:SignedRequest):Promise<void>;
  deleteVault(vaultId:string,proof:SignedRequest):Promise<void>;
}
