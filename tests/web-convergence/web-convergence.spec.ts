import {
  assertRuntimeCapabilityBoundary,
  capabilitiesForMode,
  recoveryStateForRuntime,
  surfacesForClient,
} from "../../packages/shared-experience/src";
import { assertWebConvergenceBoundary, describeWebRuntime } from "../../apps/web/src/runtime";
import { recoveryExperience } from "../../apps/web/src/recovery-ui";

describe("web deployment convergence",()=>{
  test("web uses the canonical shared product surfaces in every mode",()=>{
    assertWebConvergenceBoundary();
    const canonical=surfacesForClient("web").map(x=>x.id);
    for(const mode of ["cloud","hybrid","staging","demo"] as const){
      const runtime=describeWebRuntime({mode});
      expect(runtime.surfaces.map(x=>x.id)).toEqual(canonical);
      expect(runtime.experienceContract).toBe("shared-cervel-experience");
      expect(runtime.productFork).toBe(false);
    }
  });

  test("staging and demo are capability modes rather than alternate products",()=>{
    const staging=describeWebRuntime({mode:"staging"});
    const demo=describeWebRuntime({mode:"demo"});
    expect(staging.capabilities.stagingDiagnostics).toBe(true);
    expect(staging.capabilities.demoSeedData).toBe(false);
    expect(demo.capabilities.demoSeedData).toBe(true);
    expect(demo.surfaces.map(x=>x.contract)).toEqual(staging.surfaces.map(x=>x.contract));
  });

  test("local/cloud differences live in runtime capabilities",()=>{
    const local=capabilitiesForMode("local"),cloud=capabilitiesForMode("cloud"),hybrid=capabilitiesForMode("hybrid");
    expect(local.transport).toBe("local-node");
    expect(cloud.transport).toBe("cloud-api");
    expect(hybrid.transport).toBe("hybrid");
    expect(local.persistentKnowledge).toBe(true);
    expect(cloud.persistentKnowledge).toBe(true);
    expect(hybrid.persistentKnowledge).toBe(true);
    assertRuntimeCapabilityBoundary();
  });

  test("offline and recovery keep the canonical shell visible",()=>{
    expect(recoveryStateForRuntime({online:false,apiReachable:false})).toBe("offline");
    expect(recoveryStateForRuntime({online:true,apiReachable:false})).toBe("degraded");
    expect(recoveryStateForRuntime({online:true,apiReachable:true,recovering:true})).toBe("recovering");
    const runtime=describeWebRuntime({mode:"cloud",online:false,apiReachable:false});
    const recovery=recoveryExperience(runtime.recoveryState,runtime.capabilities);
    expect(recovery.productShellVisible).toBe(true);
    expect(recovery.canReadCachedKnowledge).toBe(true);
    expect(recovery.canQueueWrites).toBe(true);
    expect(recovery.retryVisible).toBe(true);
  });
});
