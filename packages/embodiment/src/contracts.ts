import type { CaptureEnvelope, CervelEmbodimentKind, IpcRequest, IpcResponse } from "./index";
import { CAPTURE_PROTOCOL, IPC_PROTOCOL, createCaptureId, createSyncReadyId } from "./index";

export type CaptureDraft = Omit<CaptureEnvelope,"protocol"|"capture_id"|"sync_id"|"provenance"> & {
  provenance?: Partial<CaptureEnvelope["provenance"]>;
};

export function createCaptureEnvelope(input:CaptureDraft):CaptureEnvelope{
  const acquiredBy=(input.provenance?.acquired_by??"api") as CervelEmbodimentKind;
  const seed=[input.embodiment_id,input.device_id,input.vault_id,input.artifact.kind,input.artifact.captured_at,input.artifact.source_url??input.artifact.title??"capture"].join("\0");
  const capture_id=createCaptureId(seed);
  return {
    ...input,
    protocol:CAPTURE_PROTOCOL,
    capture_id,
    sync_id:createSyncReadyId(capture_id),
    provenance:{
      acquired_by:acquiredBy,
      trust:input.provenance?.trust??(acquiredBy==="browser_extension"?"untrusted_external_content":"user_authored"),
      instruction_policy:"never_execute"
    }
  };
}

export function createIpcRequest<T>(embodimentId:string,requestId:string,method:string,params?:T,now=new Date()):IpcRequest<T>{
  return {protocol:IPC_PROTOCOL,request_id:requestId,embodiment_id:embodimentId,method,params,issued_at:now.toISOString()};
}

export function createIpcResponse<T>(request:IpcRequest,options:{result?:T;error?:{code:string;message:string}},now=new Date()):IpcResponse<T>{
  const ok=!options.error;
  return {protocol:IPC_PROTOCOL,request_id:request.request_id,ok,result:options.result,error:options.error,completed_at:now.toISOString()};
}
