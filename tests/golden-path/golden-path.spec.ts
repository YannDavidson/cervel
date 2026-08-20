import { readFileSync } from "node:fs";
import { GoldenReport, REQUIRED_GOLDEN_CHECKS, stateDigest, verifyTrace } from "../../packages/golden-path/src";

describe("CERVEL Alpha Golden Path release contract",()=>{
  test("canonical state evidence is order independent",()=>{
    expect(stateDigest({b:[2,1],a:{z:true,y:"x"}})).toBe(stateDigest({a:{y:"x",z:true},b:[2,1]}));
  });
  test("Trace proof requires the entire answer-to-source chain",()=>{
    expect(()=>verifyTrace({answer:{id:"a"},context_package:{id:"c"},chain:[{answer_id:"a",context_package_id:"c",claim:{id:"q"},fragment:{id:"f"},artifact:{id:"r"},source:{cko_id:"o"}}]})).toThrow("GOLDEN_TRACE_INCOMPLETE");
    expect(verifyTrace({answer:{id:"a"},context_package:{id:"c"},chain:[{answer_id:"a",context_package_id:"c",claim:{id:"q"},fragment:{id:"f"},artifact:{id:"r",sha256:"0".repeat(64)},source:{cko_id:"o"}}]})).toMatchObject({complete_links:1});
  });
  test("automated qualification cannot claim signed builds or physical devices",()=>{
    const report=GoldenReport.start("test");for(const check of REQUIRED_GOLDEN_CHECKS)report.pass(check,"test evidence");report.finalize(REQUIRED_GOLDEN_CHECKS);
    expect(report.value.release_qualification).toEqual({automated_ci:"passed",signed_artifacts:"pending",real_devices:"pending"});
  });
  test("workflow drills real public APIs, restart, restore, export and revocation",()=>{
    const workflow=readFileSync(".github/workflows/alpha-golden-path.yml","utf8"),runner=readFileSync("scripts/alpha-golden-path.ts","utf8");
    for(const evidence of ["cervel -- init","cervel -- start","cervel -- backup","cervel -- restore","cervel -- export","vault verify","CERVEL_GOLDEN_RESTORED"])expect(workflow).toContain(evidence);
    for(const endpoint of ["/v1/local/captures","/v1/mobile/captures","/v1/search","/v1/reason","/trace","/v1/local/mobile/devices/"])expect(runner).toContain(endpoint);
  });
});
