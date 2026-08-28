import type { CervelEmbodiment, EmbodimentPermission, EnrollmentDecision, EnrollmentRequest } from "./index";
import { EMBODIMENT_PROTOCOL, validateEmbodiment } from "./index";

export type EmbodimentRegistryRecord = {
  embodiment: CervelEmbodiment;
  created_at: string;
  updated_at: string;
};

export class EmbodimentRegistry {
  private readonly records = new Map<string, EmbodimentRegistryRecord>();

  enroll(request: EnrollmentRequest, decision: EnrollmentDecision): CervelEmbodiment {
    if(request.protocol!==EMBODIMENT_PROTOCOL||decision.protocol!==EMBODIMENT_PROTOCOL)throw new Error("ENROLLMENT_PROTOCOL_INVALID");
    if(request.request_id!==decision.request_id||request.embodiment.embodiment_id!==decision.embodiment_id||request.embodiment.device_id!==decision.device_id)throw new Error("ENROLLMENT_DECISION_MISMATCH");
    if(new Date(request.expires_at).getTime()<=Date.now())throw new Error("ENROLLMENT_REQUEST_EXPIRED");
    if(!decision.approved)throw new Error("ENROLLMENT_DENIED");
    const requested = new Set(request.requested_permissions.map(p=>`${p.capability}:${p.effect}:${p.scope?.vault_id??"*"}`));
    for(const permission of decision.permissions){
      const key=`${permission.capability}:${permission.effect}:${permission.scope?.vault_id??"*"}`;
      if(!requested.has(key))throw new Error("ENROLLMENT_PERMISSION_ESCALATION");
    }
    const now=new Date().toISOString();
    const embodiment=validateEmbodiment({...request.embodiment,protocol:EMBODIMENT_PROTOCOL,permissions:decision.permissions,enrolled_at:decision.decided_at});
    this.records.set(embodiment.embodiment_id,{embodiment,created_at:now,updated_at:now});
    return embodiment;
  }

  register(embodiment:CervelEmbodiment):CervelEmbodiment{
    const validated=validateEmbodiment(embodiment),now=new Date().toISOString();
    const prior=this.records.get(validated.embodiment_id);
    this.records.set(validated.embodiment_id,{embodiment:validated,created_at:prior?.created_at??now,updated_at:now});
    return validated;
  }

  get(embodimentId:string){ return this.records.get(embodimentId)?.embodiment; }
  list(){ return [...this.records.values()].map(record=>record.embodiment); }

  updatePermissions(embodimentId:string,permissions:EmbodimentPermission[]){
    const record=this.records.get(embodimentId); if(!record)throw new Error("EMBODIMENT_NOT_FOUND");
    return this.register({...record.embodiment,permissions});
  }

  revoke(embodimentId:string,revokedAt=new Date().toISOString()){
    const record=this.records.get(embodimentId); if(!record)throw new Error("EMBODIMENT_NOT_FOUND");
    return this.register({...record.embodiment,revoked_at:revokedAt});
  }
}
