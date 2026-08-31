import type {EmbodimentPermission} from "../../embodiment/src/index";
import {SYNC_V2_PROTOCOL,DEVICE_ENROLLMENT_PROTOCOL,type DeviceIdentityV2,type DeviceSessionV2,type EnrollmentGrantV2,validateGrantForDevice} from "./device-enrollment";

export type DeviceRegistryV2={protocol:typeof SYNC_V2_PROTOCOL;vault_id:string;sync_epoch:number;devices:Record<string,{identity:DeviceIdentityV2;session:DeviceSessionV2}>;updated_at:string};
export function newDeviceRegistryV2(vaultId:string):DeviceRegistryV2{return {protocol:SYNC_V2_PROTOCOL,vault_id:vaultId,sync_epoch:1,devices:{},updated_at:new Date().toISOString()};}
export function enrollDeviceV2(registry:DeviceRegistryV2,identity:DeviceIdentityV2,input:{request_id:string;authorizer_device_id:string;authorizer_signature:string;permissions:EmbodimentPermission[]}):{registry:DeviceRegistryV2;grant:EnrollmentGrantV2}{
 const prior=registry.devices[identity.device_id];if(prior&&!prior.session.revoked_at)throw new Error("DEVICE_ALREADY_ENROLLED");
 const issued=new Date().toISOString(),grant:EnrollmentGrantV2={protocol:DEVICE_ENROLLMENT_PROTOCOL,request_id:input.request_id,vault_id:registry.vault_id,device_id:identity.device_id,embodiment_id:identity.embodiment_id,approved_permissions:input.permissions,sync_epoch:registry.sync_epoch,issued_at:issued,authorizer_device_id:input.authorizer_device_id,authorizer_signature:input.authorizer_signature};
 validateGrantForDevice(grant,identity);
 const session:DeviceSessionV2={protocol:SYNC_V2_PROTOCOL,vault_id:registry.vault_id,device_id:identity.device_id,embodiment_id:identity.embodiment_id,kind:identity.kind,permissions:input.permissions,sync_epoch:registry.sync_epoch,transport:"relay",enrolled_at:issued};
 return {registry:{...registry,devices:{...registry.devices,[identity.device_id]:{identity,session}},updated_at:issued},grant};
}
export function revokeDeviceV2(registry:DeviceRegistryV2,deviceId:string,now=new Date()):DeviceRegistryV2{
 const entry=registry.devices[deviceId];if(!entry)throw new Error("DEVICE_NOT_FOUND");const at=now.toISOString(),sync_epoch=registry.sync_epoch+1;return {...registry,sync_epoch,devices:{...registry.devices,[deviceId]:{...entry,session:{...entry.session,revoked_at:at}}},updated_at:at};
}
export function assertDeviceEpoch(registry:DeviceRegistryV2,deviceId:string,epoch:number){const entry=registry.devices[deviceId];if(!entry||entry.session.revoked_at)throw new Error("DEVICE_REVOKED_OR_UNKNOWN");if(epoch!==registry.sync_epoch||entry.session.sync_epoch>epoch)throw new Error("SYNC_EPOCH_STALE");return entry;}
export function rotateSessionsToEpoch(registry:DeviceRegistryV2):DeviceRegistryV2{const devices=Object.fromEntries(Object.entries(registry.devices).map(([id,entry])=>[id,entry.session.revoked_at?entry:{...entry,session:{...entry.session,sync_epoch:registry.sync_epoch}}]));return {...registry,devices,updated_at:new Date().toISOString()};}
