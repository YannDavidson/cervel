import type { CervelRecoveryState, CervelRuntimeCapabilities } from "../../../packages/shared-experience/src";

export interface RecoveryExperienceModel {
  state: CervelRecoveryState;
  title: string;
  detail: string;
  canReadCachedKnowledge: boolean;
  canQueueWrites: boolean;
  retryVisible: boolean;
  productShellVisible: true;
}

export function recoveryExperience(state:CervelRecoveryState,capabilities:CervelRuntimeCapabilities):RecoveryExperienceModel{
  const copy:Record<CervelRecoveryState,{title:string;detail:string;retryVisible:boolean}>={
    online:{title:"Connected",detail:"CERVEL is connected to its active knowledge runtime.",retryVisible:false},
    degraded:{title:"Connection degraded",detail:"The CERVEL experience stays available while the knowledge runtime reconnects.",retryVisible:true},
    offline:{title:"Offline",detail:"Cached knowledge remains readable and supported writes can wait for recovery.",retryVisible:true},
    recovering:{title:"Recovering",detail:"CERVEL is restoring the runtime connection and reconciling queued work.",retryVisible:false},
  };
  return {...copy[state],state,canReadCachedKnowledge:capabilities.offlineRead,canQueueWrites:capabilities.offlineWriteQueue,productShellVisible:true};
}
