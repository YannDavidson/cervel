import type { DeviceRegistration,EncryptedChunk,EncryptedEnvelope,SignedRequest,SyncRelayTransport } from "./protocol";

export class HttpSyncRelay implements SyncRelayTransport{
  constructor(private readonly baseUrl:string){const url=new URL(baseUrl);if(url.protocol!=="https:"&&!(["localhost","127.0.0.1","::1"].includes(url.hostname)))throw new Error("SYNC_RELAY_HTTPS_REQUIRED");}
  private async call(path:string,method:string,proof:SignedRequest,body?:unknown){const headers:Record<string,string>={"x-cervel-device":proof.device_id,"x-cervel-timestamp":proof.timestamp,"x-cervel-nonce":proof.nonce,"x-cervel-body-sha256":proof.body_sha256,"x-cervel-signature":proof.signature};if(body!==undefined)headers["content-type"]="application/json";const response=await fetch(new URL(path,this.baseUrl),{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60_000)}),text=await response.text();let payload:any;try{payload=text?JSON.parse(text):null;}catch{payload={error:text};}if(!response.ok)throw new Error(payload?.error??`SYNC_RELAY_HTTP_${response.status}`);return payload;}
  async registerVault(vaultId:string,device:DeviceRegistration,proof:SignedRequest){await this.call(`/v1/sync/vaults/${vaultId}`,"POST",proof,device);}
  async enrollDevice(vaultId:string,device:DeviceRegistration,proof:SignedRequest){await this.call(`/v1/sync/vaults/${vaultId}/devices`,"POST",proof,device);}
  async revokeDevice(vaultId:string,deviceId:string,proof:SignedRequest){await this.call(`/v1/sync/vaults/${vaultId}/devices/${deviceId}`,"DELETE",proof,{device_id:deviceId});}
  push(vaultId:string,envelopes:EncryptedEnvelope[],proof:SignedRequest){return this.call(`/v1/sync/vaults/${vaultId}/records`,"POST",proof,{envelopes});}
  async pull(vaultId:string,after:number,limit:number,proof:SignedRequest){return this.call(`/v1/sync/vaults/${vaultId}/records?after=${after}&limit=${limit}`,"GET",proof);}
  async missingChunks(vaultId:string,ids:string[],proof:SignedRequest){return (await this.call(`/v1/sync/vaults/${vaultId}/chunks/missing`,"POST",proof,{ids})).missing;}
  putChunkPart(vaultId:string,meta:Omit<EncryptedChunk,"ciphertext">,offset:number,ciphertextPart:string,final:boolean,proof:SignedRequest){return this.call(`/v1/sync/vaults/${vaultId}/chunks/${meta.chunk_id}`,"PUT",proof,{meta,offset,ciphertext_part:ciphertextPart,final});}
  getChunk(vaultId:string,id:string,proof:SignedRequest){return this.call(`/v1/sync/vaults/${vaultId}/chunks/${id}`,"GET",proof);}
  async resetDevice(vaultId:string,proof:SignedRequest){await this.call(`/v1/sync/vaults/${vaultId}/reset`,"POST",proof,{});}
  async deleteVault(vaultId:string,proof:SignedRequest){await this.call(`/v1/sync/vaults/${vaultId}`,"DELETE",proof,{});}
}
