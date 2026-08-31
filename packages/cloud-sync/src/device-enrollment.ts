import type { CervelEmbodimentKind, EmbodimentCapability, EmbodimentPermission } from "../../embodiment/src/index";

export const SYNC_V2_PROTOCOL="cervel-sync/v2" as const;
export const DEVICE_ENROLLMENT_PROTOCOL="cervel-device-enrollment/v2" as const;
export type SyncTransport="relay"|"lan"|"loopback";

export type DeviceIdentityV2={
  protocol:typeof DEVICE_ENROLLMENT_PROTOCOL;
  device_id:string;
  embodiment_id:string;
  kind:CervelEmbodimentKind;
  display_name:string;
  platform?:string;
  app_version?:string;
  signing_public_key:string;
  encryption_public_key:string;
  key_fingerprint:string;
  capabilities:EmbodimentCapability[];
  requested_permissions:EmbodimentPermission[];
  created_at:string;
};

export type EnrollmentChallengeV2={
  protocol:typeof DEVICE_ENROLLMENT_PROTOCOL;
  request_id:string;
  vault_id:string;
  node_id:string;
  device:DeviceIdentityV2;
  pairing_nonce:string;
  issued_at:string;
  expires_at:string;
};

export type EnrollmentGrantV2={
  protocol:typeof DEVICE_ENROLLMENT_PROTOCOL;
  request_id:string;
  vault_id:string;
  device_id:string;
  embodiment_id:string;
  approved_permissions:EmbodimentPermission[];
  sync_epoch:number;
  issued_at:string;
  expires_at?:string;
  authorizer_device_id:string;
  authorizer_signature:string;
};

export type EncryptedEnrollmentBundleV2={
  protocol:typeof DEVICE_ENROLLMENT_PROTOCOL;
  vault_id:string;
  device_id:string;
  embodiment_id:string;
  sync_epoch:number;
  ephemeral_public_key:string;
  nonce:string;
  ciphertext:string;
  tag:string;
  issued_at:string;
  expires_at:string;
};

export type DeviceSessionV2={
  protocol:typeof SYNC_V2_PROTOCOL;
  vault_id:string;
  device_id:string;
  embodiment_id:string;
  kind:CervelEmbodimentKind;
  permissions:EmbodimentPermission[];
  sync_epoch:number;
  transport:SyncTransport;
  enrolled_at:string;
  last_sync_at?:string;
  revoked_at?:string;
};

const ID=/^(dev|emb|enr)_[A-Za-z0-9_-]{20,80}$/;
export function validateDeviceIdentityV2(input:DeviceIdentityV2):DeviceIdentityV2{
  if(input.protocol!==DEVICE_ENROLLMENT_PROTOCOL)throw new Error("DEVICE_ENROLLMENT_PROTOCOL_INVALID");
  if(!ID.test(input.device_id)||!ID.test(input.embodiment_id))throw new Error("DEVICE_IDENTITY_INVALID");
  if(!input.signing_public_key.includes("PUBLIC KEY")||!input.encryption_public_key.includes("PUBLIC KEY"))throw new Error("DEVICE_PUBLIC_KEY_INVALID");
  if(!/^[a-f0-9]{64}$/.test(input.key_fingerprint))throw new Error("DEVICE_KEY_FINGERPRINT_INVALID");
  if(!input.capabilities.includes("device.pair")||!input.capabilities.includes("sync.read"))throw new Error("DEVICE_SYNC_CAPABILITY_REQUIRED");
  return {...input,display_name:input.display_name.normalize("NFKC").trim().slice(0,160),created_at:new Date(input.created_at).toISOString()};
}

export function validateEnrollmentChallengeV2(input:EnrollmentChallengeV2,now=Date.now()):EnrollmentChallengeV2{
  validateDeviceIdentityV2(input.device);
  if(input.protocol!==DEVICE_ENROLLMENT_PROTOCOL||!/^enr_[A-Za-z0-9_-]{20,80}$/.test(input.request_id))throw new Error("ENROLLMENT_REQUEST_INVALID");
  if(Date.parse(input.expires_at)<=now)throw new Error("ENROLLMENT_REQUEST_EXPIRED");
  if(Date.parse(input.expires_at)-Date.parse(input.issued_at)>15*60_000)throw new Error("ENROLLMENT_TTL_INVALID");
  return input;
}

export function validateGrantForDevice(grant:EnrollmentGrantV2,device:DeviceIdentityV2){
  if(grant.protocol!==DEVICE_ENROLLMENT_PROTOCOL||grant.device_id!==device.device_id||grant.embodiment_id!==device.embodiment_id)throw new Error("ENROLLMENT_GRANT_BINDING_FAILURE");
  if(!Number.isSafeInteger(grant.sync_epoch)||grant.sync_epoch<1)throw new Error("SYNC_EPOCH_INVALID");
  const requested=new Set(device.requested_permissions.map(p=>`${p.capability}:${p.scope?.vault_id??"*"}`));
  for(const permission of grant.approved_permissions){if(!requested.has(`${permission.capability}:${permission.scope?.vault_id??"*"}`))throw new Error("ENROLLMENT_PERMISSION_ESCALATION");}
  return grant;
}

export function canSynchronize(session:DeviceSessionV2){
  if(session.revoked_at)return false;
  return session.permissions.some(p=>p.capability==="sync.read"&&p.effect==="allow")||session.permissions.some(p=>p.capability==="sync.write"&&p.effect==="allow");
}
