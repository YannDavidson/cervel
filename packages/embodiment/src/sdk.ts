import type { CaptureEnvelope, CervelEmbodiment, EmbodimentCapability, IpcRequest, IpcResponse, LocalNodeAdvertisement, OfflineCaptureEnvelope } from "./index";
import { IPC_PROTOCOL, createOfflineEnvelope, isAllowed, validateAdvertisement, validateCapture } from "./index";

export interface EmbodimentTransport {
  discover?(): Promise<LocalNodeAdvertisement[]>;
  request<T=unknown,R=unknown>(message:IpcRequest<T>):Promise<IpcResponse<R>>;
}

export class CervelEmbodimentSdk {
  constructor(public readonly embodiment:CervelEmbodiment, private readonly transport:EmbodimentTransport){}

  permission(capability:EmbodimentCapability,vaultId:string){
    return isAllowed(this.embodiment,capability,vaultId);
  }

  assertAllowed(capability:EmbodimentCapability,vaultId:string){
    const decision=this.permission(capability,vaultId);
    if(decision!=="allow")throw new Error(decision==="approval_required"?"EMBODIMENT_APPROVAL_REQUIRED":"EMBODIMENT_PERMISSION_DENIED");
  }

  async discoverLocalNodes(){
    if(!this.transport.discover)return [];
    const now=Date.now(), nodes=await this.transport.discover();
    return nodes.map(node=>validateAdvertisement(node,now));
  }

  async call<T=unknown,R=unknown>(method:string,params?:T):Promise<R>{
    const request:IpcRequest<T>={protocol:IPC_PROTOCOL,request_id:`ipc_${cryptoLikeId()}`,embodiment_id:this.embodiment.embodiment_id,method,params,issued_at:new Date().toISOString()};
    const response=await this.transport.request<T,R>(request);
    if(response.protocol!==IPC_PROTOCOL||response.request_id!==request.request_id)throw new Error("IPC_RESPONSE_INVALID");
    if(!response.ok)throw new Error(response.error?.code??"IPC_REQUEST_FAILED");
    return response.result as R;
  }

  queueCapture(capture:CaptureEnvelope,sequence:number):OfflineCaptureEnvelope{
    this.assertAllowed("vault.write",capture.vault_id);
    return createOfflineEnvelope(validateCapture(capture),sequence);
  }
}

function cryptoLikeId(){
  const bytes=new Uint8Array(18);
  if(typeof globalThis.crypto!=="undefined"&&typeof globalThis.crypto.getRandomValues==="function")globalThis.crypto.getRandomValues(bytes);
  else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
  return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
