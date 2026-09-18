import { readFileSync } from "node:fs";
import { BUILTIN_CORPORA, BUILTIN_CORPUS_KEYS, classifyForCorpora } from "../../packages/corpus-engine/src";
import { runtimeCorpusViewKey } from "../../apps/api/src/corpus-runtime-view";

const expected:Record<string,string[]>={
  life:["Personal","Relationships & Family","Health","Work & Career","Education","Projects","Finance","Home","Memory","Personal Knowledge","Digital Life","Travel","Hobbies & Interests","Goals","Civic & Community","Legal & Administrative","Legacy"],
  enterprise:["Organization","People","Strategy","Operations","Projects","Products","Customers","Sales","Marketing","Finance","Legal / Risk / Compliance","Research","Institutional Knowledge","Technology","Data","AI & Agents","Enterprise Memory","External Ecosystem"],
  knowledge:["Concepts","Claims","Facts","Disciplines","Theories","Methods","Research","Evidence","Sources","Discoveries","Models","Frameworks","Questions","Relationships"],
  world:["Countries","Regions","Cities & Places","Geography","Environment","Economies","Infrastructure","Governments","Institutions","Physical Locations","World Events","World State"],
  civilization:["Peoples","Cultures","Languages","History","Traditions","Religions","Customs","Laws","Social Institutions","Arts","Heritage","Collective Memory"],
  machine:["Devices","Machines","Components","Sensors","Configurations","Telemetry","Operational State","Maintenance","Failures","Repairs","Software / Firmware","Lifecycle"],
  ai:["Models","Agents","Tools","Capabilities","Prompts / Instructions","Permissions","Actions","Evaluations","Lineage","Agent Memory","Model History","AI Relationships"],
  experience:["Events","Activities","Interactions","Observations","Meetings","Decisions","Outcomes","Incidents","Experiments","Journeys","Episodes","Timelines"],
  resource:["Money","Time","Labor","Compute","Storage","Energy","Infrastructure","Materials","Capacity","Ownership","Allocation","Availability"],
  "civic-national":["Government","Ministries & Agencies","Municipalities","Public Institutions","Education","Universities","Law & Regulation","Public Records","Statistics","Economy","Infrastructure","Health","Environment","History","Culture","Languages","Heritage","Public Research","Public Datasets","Archives","Communities","National Memory"]
};

describe("PR #92 — Multi-Corpus Registry & Expanded Canonical Corpuses",()=>{
  test("ships the complete ten-corpus registry without skipped branches",()=>{
    expect(BUILTIN_CORPUS_KEYS).toEqual(Object.keys(expected));
    expect(BUILTIN_CORPORA).toHaveLength(10);
    for(const corpus of BUILTIN_CORPORA){
      expect(corpus.taxonomy.map(x=>x.title)).toEqual(expected[corpus.key]);
      expect(corpus.taxonomy.every(x=>x.tabs[0]?.key==="overview"&&x.tabs[0].subtabs.length>=5)).toBe(true);
      expect(runtimeCorpusViewKey(corpus.key)).toBe(corpus.key);
    }
  });

  test("supports multi-corpus and multi-path classification over one canonical object",()=>{
    const result=classifyForCorpora({
      type:"research",
      title:"University research on Ewe language in Ghana",
      summary:"Public research evidence, language history, university education, AI model analysis, funding and national archives.",
      topics:["research","language","history","university","ai","funding","archive"]
    });
    const corpora=new Set(result.map(x=>x.corpus_key));
    for(const key of ["enterprise","knowledge","civilization","ai","civic-national"]) expect(corpora.has(key)).toBe(true);
    expect(result.filter(x=>x.corpus_key==="civic-national").length).toBeGreaterThan(1);
    const coordinates=result.map(x=>[x.corpus_key,x.mega_tab,x.tab,x.subtab??""].join("/"));
    expect(new Set(coordinates).size).toBe(coordinates.length);
  });

  test("Desktop and Local Node expose the universal registry rather than a Life/Enterprise fork",()=>{
    const explorer=readFileSync("apps/api/src/vault-explorer.ts","utf8");
    const local=readFileSync("apps/api/src/local-node-routes.ts","utf8");
    const mobile=readFileSync("apps/api/src/mobile-routes.ts","utf8");
    const capture=readFileSync("apps/api/src/capture-routes.ts","utf8");
    const compiler=readFileSync("apps/api/src/knowledge-compiler.ts","utf8");
    const vault=readFileSync("apps/api/src/vault-explorer.ts","utf8");
    const desktop=readFileSync("apps/desktop-tauri/ui/workspace.js","utf8");
    const index=readFileSync("apps/desktop-tauri/ui/index.html","utf8");
    const rust=readFileSync("apps/desktop-tauri/src-tauri/src/lib.rs","utf8");
    expect(explorer).toContain("for (const view of BUILTIN_CORPUS_KEYS)");
    expect(explorer).toContain("ensureBuiltinCorpora");
    expect(local).toContain("addManualMembership");
    expect(local).toContain('tab:"overview"');
    for(const surface of [mobile,capture,compiler]) expect(surface).toContain("autoClassifyCkoIfRegistered");
    expect(mobile).toContain('triggerEvent:"capture.ingested"');
    expect(vault).toContain("resolveRetrievalScope");
    expect(vault).toContain("ko.id=ANY($${values.length}::uuid[])");
    expect(desktop).toContain("canonicalCorpusOrder=['life','enterprise','knowledge','world','civilization','machine','ai','experience','resource','civic-national']");
    expect(desktop).toContain("explorer.semantic_views?.[key]");
    expect(desktop).toContain("[data-corpus-open]");
    for(const key of ["life","enterprise","knowledge","world","civilization","machine","ai","experience","resource","civic-national"]) expect(index).toContain(`data-corpus-open="${key}"`);
    expect(index).toContain("<h2>Canonical Corpora</h2>");
    expect(rust).not.toContain('corpus=="life"||corpus=="enterprise"');
  });

  test("automatic classification respects persisted user overrides",()=>{
    const engine=readFileSync("apps/api/src/corpus-engine.ts","utf8");
    const migration=readFileSync("db/migrations/035_multi_corpus_registry.sql","utf8");
    expect(engine).toContain("corpus_membership_suppressions");
    expect(engine).toContain("resolveRetrievalScope");
    expect(engine).toContain("provenance_io");
    expect(engine).toContain("FROM relationships");
    expect(engine).toContain("membership_source<>'manual'");
    expect(engine).toContain("removeMembership");
    expect(engine).toContain("CORPUS_TAXONOMY_COORDINATE_INVALID");
    expect(migration).toContain("UNIQUE NULLS NOT DISTINCT");
    expect(migration).toContain("user sovereignty overrides");
  });

  test("all public runtime contracts remain model-independent and canonical-CKO based",()=>{
    const routes=readFileSync("apps/api/src/corpus-routes.ts","utf8");
    const engine=readFileSync("apps/api/src/corpus-engine.ts","utf8");
    for(const marker of ["/v1/corpora","/v1/corpus-runtime","/v1/corpora/classify/:ckoId","/v1/corpora/:id/memberships","/v1/corpora/memberships/:ckoId","/v1/corpus-view"]) expect(routes).toContain(marker);
    expect(routes).toContain('app.delete("/v1/corpora/memberships/:membershipId"');
    expect(engine).toContain("corpus_cko_semantic_view");
    expect(engine).toContain("scope.allowedCkoIds");
    expect(engine).not.toMatch(/openai|anthropic|gemini/i);
  });
});
