import { createHash } from "node:crypto";

export const CORPUS_ENGINE_VERSION = "1.1" as const;
export const BUILTIN_CORPUS_KEYS = ["life","enterprise","knowledge","world","civilization","machine","ai","experience","resource","civic-national"] as const;
export type BuiltinCorpusKey = typeof BUILTIN_CORPUS_KEYS[number];
export type CorpusVisibility = "public" | "node" | "restricted" | "private";
export type TaxonomyNode = { key:string; title:string; tabs:Array<{key:string;title:string;subtabs:string[]}> };
export type CorpusDefinition = { key:string; title:string; description:string; visibility:CorpusVisibility; taxonomy:TaxonomyNode[]; extension_of?:string|null; rules:CorpusRule[] };
export type CorpusRule = { field:"type"|"title"|"summary"|"language"|"jurisdiction"|"tag"|"topic"|"vertical"|"intent"|"source"|"provenance"|"relationship"|"temporal"|"authority"; terms:string[]; weight:number; mega_tab:string; tab:string; subtab?:string };
export type CorpusCandidate = { corpus_key:string; confidence:number; mega_tab:string; tab:string; subtab:string|null; reasons:string[] };
export type ClassificationInput = { type?:string; title?:string; summary?:string; languages?:string[]; jurisdictions?:string[]; tags?:string[]; topics?:string[]; verticals?:string[]; intents?:string[]; sources?:string[]; provenance?:string[]; relationships?:string[]; temporal?:string[]; authority?:string[] };

type BranchSpec=[string,string[],string[]?];
const slug=(v:string)=>v.toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const taxonomy=(branches:BranchSpec[]):TaxonomyNode[]=>branches.map(([title,,subtabs])=>({key:slug(title),title,tabs:[{key:"overview",title:"Overview",subtabs:subtabs??["Overview","Records","Relationships","Timeline","Sources"]}]}));
const rules=(branches:BranchSpec[]):CorpusRule[]=>branches.flatMap(([title,terms])=>[
 {field:"topic",terms,weight:.55,mega_tab:slug(title),tab:"overview"},
 {field:"tag",terms,weight:.65,mega_tab:slug(title),tab:"overview"},
 {field:"type",terms,weight:.45,mega_tab:slug(title),tab:"overview"},
 {field:"source",terms,weight:.4,mega_tab:slug(title),tab:"overview"},
 {field:"provenance",terms,weight:.35,mega_tab:slug(title),tab:"overview"},
 {field:"relationship",terms,weight:.4,mega_tab:slug(title),tab:"overview"},
 {field:"authority",terms,weight:.3,mega_tab:slug(title),tab:"overview"}
] as CorpusRule[]);
const corpus=(key:BuiltinCorpusKey,title:string,description:string,visibility:CorpusVisibility,branches:BranchSpec[],extra:CorpusRule[]=[]):CorpusDefinition=>({key,title,description,visibility,taxonomy:taxonomy(branches),rules:[...rules(branches),...extra]});

const LIFE:BranchSpec[]=[
["Personal",["personal","identity","profile","preference"],["Profile","Identity","Preferences","Routines","Documents"]],
["Relationships & Family",["family","parent","child","partner","friend","relationship"],["Family","Partner","Friends","Contacts","History"]],
["Health",["health","medical","doctor","diagnosis","fitness"],["Wellbeing","Fitness","Care","Medical Records","Medications"]],
["Work & Career",["work","career","job","employer","resume"],["Roles","Organizations","Resume","Achievements","Career Plans"]],
["Education",["education","school","course","degree","learning"],["Schools","Courses","Credentials","Learning","Research"]],
["Projects",["project","roadmap","milestone","deliverable","launch"],["Active","Planned","Completed","Ideas","Artifacts"]],
["Finance",["finance","bank","income","budget","tax","investment"],["Budget","Income","Assets","Accounts","Taxes","Obligations"]],
["Home",["home","house","apartment","property","household"],["Places","Household","Property","Utilities","Security"]],
["Memory",["memory","journal","diary","milestone","timeline"],["Episodes","Timeline","Milestones","Journals","People"]],
["Personal Knowledge",["note","research","idea","insight","question","source"],["Notes","Ideas","Research","Questions","Sources"]],
["Digital Life",["digital","account","device","email","software","online"],["Accounts","Devices","Software","Activity","Credentials"]],
["Travel",["travel","trip","flight","hotel","itinerary","visa"],["Trips","Places","Plans","Bookings","Identity Documents"]],
["Hobbies & Interests",["hobby","interest","music","sport","art","collection"],["Interests","Practice","Collections","Events","Ideas"]],
["Goals",["goal","objective","habit","progress","commitment"],["Current","Future","Habits","Progress","Reviews"]],
["Civic & Community",["community","civic","volunteer","association","nonprofit"],["Communities","Organizations","Service","Events","Issues"]],
["Legal & Administrative",["legal","court","contract","immigration","government","insurance"],["Identity","Cases","Contracts","Government","Insurance"]],
["Legacy",["legacy","estate","will","lineage","heritage","archive"],["Estate","Values","Works","Lineage","Stewardship"]]
];
const ENTERPRISE:BranchSpec[]=[
["Organization",["organization","company","governance","structure"],["Identity","Structure","Governance","Locations","Policies"]],
["People",["employee","people","team","role","hiring"],["Directory","Teams","Roles","Hiring","Capabilities"]],
["Strategy",["strategy","mission","vision","objective","competitive"],["Mission","Objectives","Plans","Analysis","Decisions"]],
["Operations",["operation","process","workflow","procedure","delivery"],["Processes","Workflows","Controls","Vendors","Performance"]],
["Projects",["project","milestone","deliverable","initiative","dependency"],["Portfolio","Active","Planned","Completed","Decisions"]],
["Products",["product","service","feature","requirement","release"],["Portfolio","Requirements","Roadmaps","Releases","Feedback"]],
["Customers",["customer","client","account","support","success"],["Accounts","Needs","Success","Support","Feedback"]],
["Sales",["sales","pipeline","lead","opportunity","proposal","deal"],["Pipeline","Accounts","Opportunities","Proposals","Forecasts"]],
["Marketing",["marketing","campaign","brand","content","audience"],["Brand","Markets","Campaigns","Content","Analytics"]],
["Finance",["finance","budget","revenue","expense","accounting"],["Budget","Revenue","Costs","Reporting","Forecasts"]],
["Legal / Risk / Compliance",["legal","risk","compliance","contract","audit","regulation"],["Contracts","Risk","Compliance","Audits","Obligations"]],
["Research",["research","study","evidence","experiment","finding"],["Programs","Evidence","Experiments","Findings","Sources"]],
["Institutional Knowledge",["institutional","method","standard","playbook","lesson"],["Methods","Standards","Playbooks","Decisions","Lessons"]],
["Technology",["technology","architecture","software","infrastructure","api"],["Architecture","Systems","Software","Infrastructure","Operations"]],
["Data",["data","dataset","schema","lineage","quality","analytics"],["Catalog","Schemas","Lineage","Quality","Governance"]],
["AI & Agents",["ai","model","agent","prompt","evaluation","inference"],["Models","Agents","Prompts","Evaluations","Governance"]],
["Enterprise Memory",["memory","history","incident","transition","retrospective"],["Timeline","Events","Decisions","Incidents","Retrospectives"]],
["External Ecosystem",["partner","supplier","regulator","competitor","market"],["Partners","Suppliers","Regulators","Competitors","Markets"]]
];
const KNOWLEDGE:BranchSpec[]=[
["Concepts",["concept","definition","idea"],["Definitions","Entities","Relationships","Examples","Sources"]],
["Claims",["claim","assertion","statement"],["Proposed","Supported","Disputed","Superseded","Evidence"]],
["Facts",["fact","verified","known"],["Verified","Temporal","Quantitative","Context","Sources"]],
["Disciplines",["discipline","field","domain"],["Fields","Subfields","Methods","People","Institutions"]],
["Theories",["theory","hypothesis","model"],["Theories","Hypotheses","Predictions","Critiques","Evidence"]],
["Methods",["method","procedure","technique"],["Methods","Protocols","Tools","Validation","Examples"]],
["Research",["research","study","paper","experiment"],["Programs","Studies","Experiments","Findings","Open Questions"]],
["Evidence",["evidence","proof","observation"],["Primary","Secondary","Measurements","Corroboration","Conflicts"]],
["Sources",["source","citation","reference"],["Primary","Secondary","Datasets","Archives","Bibliography"]],
["Discoveries",["discovery","finding","breakthrough"],["Findings","People","Dates","Impact","Sources"]],
["Models",["model","framework","simulation"],["Conceptual","Statistical","Computational","Assumptions","Validation"]],
["Frameworks",["framework","taxonomy","ontology"],["Frameworks","Taxonomies","Ontologies","Mappings","Applications"]],
["Questions",["question","unknown","inquiry"],["Open","Answered","Researchable","Dependencies","Evidence"]],
["Relationships",["relationship","relation","link"],["Entities","Causal","Temporal","Hierarchical","Evidence"]]
];
const WORLD:BranchSpec[]=[
["Countries",["country","nation","state"],["Profile","Government","Economy","Population","Knowledge"]],
["Regions",["region","province","state","territory"],["Profile","Geography","Population","Institutions","History"]],
["Cities & Places",["city","town","place","location"],["Places","Districts","Landmarks","Population","History"]],
["Geography",["geography","terrain","map","border"],["Physical","Political","Borders","Maps","Resources"]],
["Environment",["environment","climate","ecology","weather"],["Climate","Ecosystems","Biodiversity","Risks","Monitoring"]],
["Economies",["economy","gdp","trade","market"],["Indicators","Industries","Trade","Labor","Finance"]],
["Infrastructure",["infrastructure","transport","energy","network"],["Transport","Energy","Water","Digital","Public Works"]],
["Governments",["government","ministry","parliament","administration"],["Executive","Legislative","Judicial","Agencies","Policy"]],
["Institutions",["institution","university","hospital","organization"],["Public","Academic","Health","Cultural","International"]],
["Physical Locations",["address","site","facility","coordinates"],["Sites","Facilities","Coordinates","Boundaries","Access"]],
["World Events",["event","crisis","summit","election"],["Current","Historical","Participants","Timeline","Sources"]],
["World State",["status","indicator","current","signal"],["Indicators","Signals","Risks","Changes","Sources"]]
];
const CIVILIZATION:BranchSpec[]=[
["Peoples",["people","ethnic","community"],["Peoples","Origins","Diaspora","Institutions","Memory"]],
["Cultures",["culture","cultural"],["Practices","Values","Arts","Material Culture","Memory"]],
["Languages",["language","linguistic","dialect"],["Languages","Dialects","Writing","Vocabulary","Resources"]],
["History",["history","historical","era"],["Eras","Events","People","Places","Sources"]],
["Traditions",["tradition","ritual","custom"],["Rituals","Ceremonies","Knowledge","Transmission","Sources"]],
["Religions",["religion","faith","spiritual"],["Traditions","Texts","Practices","Institutions","History"]],
["Customs",["custom","etiquette","practice"],["Social","Family","Ceremonial","Regional","Change"]],
["Laws",["law","legal","code"],["Customary","Statutory","Historical","Institutions","Sources"]],
["Social Institutions",["institution","kinship","community"],["Family","Education","Governance","Economy","Associations"]],
["Arts",["art","music","dance","literature"],["Visual","Music","Dance","Literature","Performance"]],
["Heritage",["heritage","monument","archive"],["Tangible","Intangible","Sites","Collections","Preservation"]],
["Collective Memory",["memory","oral history","commemoration"],["Oral History","Archives","Commemoration","Narratives","Sources"]]
];
const MACHINE:BranchSpec[]=[
["Devices",["device","hardware","computer"],["Inventory","Identity","Configuration","State","History"]],
["Machines",["machine","equipment","robot"],["Inventory","Components","Configuration","Operations","History"]],
["Components",["component","part","module"],["Hardware","Software","Dependencies","Specifications","Lifecycle"]],
["Sensors",["sensor","measurement","iot"],["Inventory","Signals","Calibration","Readings","Health"]],
["Configurations",["configuration","config","setting"],["Baseline","Current","Changes","Dependencies","Secrets"]],
["Telemetry",["telemetry","metric","log"],["Metrics","Logs","Traces","Alerts","History"]],
["Operational State",["state","status","uptime"],["Current","Health","Capacity","Dependencies","Incidents"]],
["Maintenance",["maintenance","service","inspection"],["Schedules","Procedures","Records","Parts","Vendors"]],
["Failures",["failure","fault","error"],["Incidents","Root Causes","Impact","Evidence","Resolution"]],
["Repairs",["repair","fix","replacement"],["Work Orders","Actions","Parts","Verification","History"]],
["Software / Firmware",["software","firmware","version"],["Software","Firmware","Versions","Dependencies","Updates"]],
["Lifecycle",["lifecycle","commission","retire"],["Acquisition","Deployment","Operation","Upgrade","Retirement"]]
];
const AI:BranchSpec[]=[
["Models",["model","llm","embedding"],["Registry","Versions","Capabilities","Limits","Lineage"]],
["Agents",["agent","assistant","autonomous"],["Registry","Roles","Plans","Memory","History"]],
["Tools",["tool","function","connector"],["Registry","Interfaces","Permissions","Dependencies","Receipts"]],
["Capabilities",["capability","skill","ability"],["Declared","Verified","Benchmarks","Limits","Dependencies"]],
["Prompts / Instructions",["prompt","instruction","system message"],["System","Developer","User","Templates","Versions"]],
["Permissions",["permission","grant","scope"],["Scopes","Grants","Denials","Policies","History"]],
["Actions",["action","execution","tool call"],["Requested","Executed","Failed","Receipts","Effects"]],
["Evaluations",["evaluation","benchmark","test"],["Suites","Runs","Metrics","Failures","Comparisons"]],
["Lineage",["lineage","training","fine-tune"],["Origins","Datasets","Versions","Derivatives","Provenance"]],
["Agent Memory",["memory","checkpoint","context"],["Working","Persistent","Shared","Summaries","History"]],
["Model History",["model history","release","version"],["Versions","Releases","Changes","Deprecations","Continuity"]],
["AI Relationships",["ai relationship","orchestration","handoff"],["Models","Agents","Tools","Humans","Dependencies"]]
];
const EXPERIENCE:BranchSpec[]=[
["Events",["event","occasion"],["Events","Participants","Places","Timeline","Evidence"]],
["Activities",["activity","task","action"],["Activities","People","Places","Outputs","Timeline"]],
["Interactions",["interaction","conversation","meeting"],["Human","AI","Machine","Organization","History"]],
["Observations",["observation","noticed","observed"],["Observations","Context","Evidence","Interpretation","Follow-up"]],
["Meetings",["meeting","call","workshop"],["Meetings","Participants","Notes","Decisions","Actions"]],
["Decisions",["decision","decided","choice"],["Decisions","Rationale","Participants","Evidence","Consequences"]],
["Outcomes",["outcome","result","impact"],["Results","Metrics","Effects","Lessons","Evidence"]],
["Incidents",["incident","accident","outage"],["Timeline","Impact","Response","Evidence","Lessons"]],
["Experiments",["experiment","trial","test"],["Hypothesis","Method","Runs","Results","Lessons"]],
["Journeys",["journey","trip","travel"],["Routes","Places","People","Artifacts","Timeline"]],
["Episodes",["episode","experience","memory"],["Episodes","People","Places","Media","Reflections"]],
["Timelines",["timeline","chronology","sequence"],["Periods","Events","Milestones","Transitions","Sources"]]
];
const RESOURCE:BranchSpec[]=[
["Money",["money","cash","budget","funding"],["Accounts","Budgets","Transactions","Allocations","Forecasts"]],
["Time",["time","schedule","deadline"],["Calendars","Availability","Deadlines","Allocations","History"]],
["Labor",["labor","workforce","staff"],["People","Roles","Capacity","Assignments","Costs"]],
["Compute",["compute","cpu","gpu","inference"],["Capacity","Usage","Reservations","Costs","Providers"]],
["Storage",["storage","disk","archive"],["Capacity","Usage","Locations","Backups","Costs"]],
["Energy",["energy","power","electricity"],["Sources","Capacity","Usage","Costs","Resilience"]],
["Infrastructure",["infrastructure","facility","network"],["Facilities","Networks","Platforms","Capacity","Dependencies"]],
["Materials",["material","inventory","supply"],["Inventory","Sources","Specifications","Usage","Availability"]],
["Capacity",["capacity","quota","limit"],["Current","Reserved","Available","Constraints","Forecasts"]],
["Ownership",["ownership","owner","asset"],["Owners","Assets","Rights","Transfers","History"]],
["Allocation",["allocation","assigned","distribution"],["Plans","Assignments","Usage","Constraints","History"]],
["Availability",["availability","available","shortage"],["Current","Forecast","Constraints","Alternatives","History"]]
];
const CIVIC:BranchSpec[]=[
["Government",["government","state","administration"],["Executive","Legislative","Judicial","Local","Records"]],
["Ministries & Agencies",["ministry","agency","department"],["Ministries","Agencies","Mandates","Leadership","Records"]],
["Municipalities",["municipality","city council","local government"],["Municipalities","Leadership","Services","Budgets","Records"]],
["Public Institutions",["public institution","authority","commission"],["Institutions","Mandates","Leadership","Services","Records"]],
["Education",["education","school","curriculum"],["Schools","Curricula","Policy","Statistics","Programs"]],
["Universities",["university","college","higher education"],["Universities","Programs","Research","People","Archives"]],
["Law & Regulation",["law","regulation","statute","code"],["Constitution","Statutes","Regulations","Cases","Gazette"]],
["Public Records",["public record","registry","filing"],["Registers","Notices","Filings","Decisions","Archives"]],
["Statistics",["statistics","census","indicator"],["Population","Economy","Health","Education","Datasets"]],
["Economy",["economy","gdp","trade","employment"],["Indicators","Industries","Trade","Labor","Finance"]],
["Infrastructure",["infrastructure","roads","energy","water"],["Transport","Energy","Water","Digital","Public Works"]],
["Health",["health","hospital","public health"],["System","Facilities","Programs","Statistics","Policy"]],
["Environment",["environment","climate","conservation"],["Climate","Land","Water","Biodiversity","Policy"]],
["History",["history","historical","archive"],["Periods","Events","People","Places","Sources"]],
["Culture",["culture","cultural","arts"],["Practices","Arts","Institutions","Events","Collections"]],
["Languages",["language","linguistic","official language"],["Languages","Dialects","Policy","Education","Resources"]],
["Heritage",["heritage","monument","museum"],["Sites","Collections","Intangible","Preservation","Archives"]],
["Public Research",["research","study","public research"],["Programs","Studies","Evidence","Findings","Institutions"]],
["Public Datasets",["dataset","open data","data portal"],["Datasets","Schemas","Publishers","Versions","Licenses"]],
["Archives",["archive","records","collection"],["National","Government","Media","Collections","Catalogs"]],
["Communities",["community","district","people"],["Communities","Organizations","Needs","Events","Knowledge"]],
["National Memory",["national memory","commemoration","oral history"],["Timeline","Events","People","Commemoration","Sources"]]
];

export const BUILTIN_CORPORA:readonly CorpusDefinition[]=[
 corpus("life","Life Corpus","Persistent personal continuity across identity, relationships, health, work, memory, goals, and legacy.","private",LIFE),
 corpus("enterprise","Enterprise Corpus","Persistent institutional knowledge for organizations, operations, strategy, customers, technology, and enterprise memory.","restricted",ENTERPRISE),
 corpus("knowledge","Knowledge Corpus","Claims, concepts, facts, research, evidence, sources, methods, models, and questions.","node",KNOWLEDGE,[{field:"type",terms:["claim","research","note","source","paper"],weight:.5,mega_tab:"concepts",tab:"overview"}]),
 corpus("world","World Corpus","Countries, places, institutions, infrastructure, economies, environments, events, and changing world state.","node",WORLD),
 corpus("civilization","Civilization Corpus","Peoples, cultures, languages, history, traditions, laws, arts, heritage, and collective memory.","node",CIVILIZATION),
 corpus("machine","Machine Corpus","Devices, machines, components, telemetry, operational state, maintenance, failures, repairs, and lifecycle.","restricted",MACHINE),
 corpus("ai","AI Corpus","Models, agents, tools, capabilities, instructions, permissions, actions, evaluations, lineage, and AI memory.","restricted",AI),
 corpus("experience","Experience Corpus","Events, activities, interactions, observations, meetings, decisions, outcomes, incidents, experiments, journeys, and timelines.","private",EXPERIENCE),
 corpus("resource","Resource Corpus","Money, time, labor, compute, storage, energy, infrastructure, materials, capacity, ownership, allocation, and availability.","node",RESOURCE),
 corpus("civic-national","Civic / National Corpus","Public and national knowledge across government, institutions, law, statistics, infrastructure, history, culture, research, archives, communities, and national memory.","node",CIVIC)
] as const;

const normalize=(value:unknown)=>Array.isArray(value)?value.join(" ").toLowerCase():String(value??"").toLowerCase();
export function validateCorpusDefinition(definition:CorpusDefinition):CorpusDefinition{
 if(!/^[a-z][a-z0-9-]{1,63}$/.test(definition.key))throw new Error("CORPUS_KEY_INVALID");
 if(!definition.title?.trim()||!definition.description?.trim())throw new Error("CORPUS_METADATA_REQUIRED");
 if(!["public","node","restricted","private"].includes(definition.visibility))throw new Error("CORPUS_VISIBILITY_INVALID");
 if(!definition.taxonomy.length||definition.taxonomy.some(m=>!m.key||!m.tabs.length||m.tabs.some(t=>!Array.isArray(t.subtabs))))throw new Error("CORPUS_TAXONOMY_INVALID");
 return definition;
}
export function classifyForCorpora(input:ClassificationInput,definitions:readonly CorpusDefinition[]=BUILTIN_CORPORA,threshold=.3):CorpusCandidate[]{
 const narrative=normalize([input.title??"",input.summary??""]),fields:Record<CorpusRule["field"],string>={type:normalize(input.type),title:normalize(input.title),summary:normalize(input.summary),language:normalize(input.languages),jurisdiction:normalize(input.jurisdictions),tag:normalize(input.tags),topic:`${normalize(input.topics)} ${narrative}`,vertical:`${normalize(input.verticals)} ${narrative}`,intent:`${normalize(input.intents)} ${narrative}`,source:normalize(input.sources),provenance:normalize(input.provenance),relationship:normalize(input.relationships),temporal:normalize(input.temporal),authority:normalize(input.authority)};
 return definitions.flatMap(def=>{const coordinates=new Map<string,{rule:CorpusRule;score:number;reasons:string[]}>();for(const r of def.rules){const hits=r.terms.filter(term=>fields[r.field].includes(term.toLowerCase()));if(!hits.length)continue;const key=`${r.mega_tab}/${r.tab}/${r.subtab??""}`,current=coordinates.get(key)??{rule:r,score:0,reasons:[]};current.score+=Math.min(r.weight,r.weight*hits.length);current.reasons.push(`${r.field}:${hits.join(",")}`);coordinates.set(key,current);}return [...coordinates.values()].filter(x=>x.score>=threshold).map(x=>({corpus_key:def.key,confidence:Math.min(.99,Number(x.score.toFixed(3))),mega_tab:x.rule.mega_tab,tab:x.rule.tab,subtab:x.rule.subtab??null,reasons:x.reasons}));}).sort((a,b)=>b.confidence-a.confidence||a.corpus_key.localeCompare(b.corpus_key)||a.mega_tab.localeCompare(b.mega_tab));
}
export function corpusRegistryDigest(definitions:readonly CorpusDefinition[]=BUILTIN_CORPORA):string{return createHash("sha256").update(JSON.stringify(definitions)).digest("hex");}
