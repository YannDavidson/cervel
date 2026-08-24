import { createHash } from "node:crypto";
import type { ClassificationInput, CorpusRule, TaxonomyNode } from "../../corpus-engine/src";

export const LIFE_CORPUS_VERSION="1.0" as const;
export type LifeSensitivity="internal"|"confidential"|"restricted"|"sealed";
export type LifeBranch={key:string;title:string;description:string;sensitivity:LifeSensitivity;terms:string[];subtabs:string[];sealed_subtabs:string[]};
const branch=(key:string,title:string,description:string,sensitivity:LifeSensitivity,terms:string[],subtabs:string[],sealed_subtabs:string[]=[]):LifeBranch=>({key,title,description,sensitivity,terms,subtabs,sealed_subtabs});

export const LIFE_BRANCHES:readonly LifeBranch[]=[
 branch("personal","Personal","Identity, preferences, routines, and personal records.","restricted",["personal","identity","profile","birthday","preference"],["Profile","Identity","Preferences","Routines","Documents"],["Identity","Documents"]),
 branch("relationships-family","Relationships & Family","Family, partners, friendships, and relationship history.","confidential",["family","parent","child","partner","spouse","friend","relationship"],["Family","Partner","Friends","Contacts","History"]),
 branch("health","Health","Physical, mental, clinical, and wellbeing knowledge.","confidential",["health","medical","doctor","patient","diagnosis","therapy","fitness"],["Wellbeing","Fitness","Care","Medical Records","Medications"],["Medical Records","Medications"]),
 branch("work-career","Work & Career","Roles, employment, professional growth, and career evidence.","confidential",["work","career","job","employer","resume","professional","promotion"],["Roles","Organizations","Resume","Achievements","Career Plans"]),
 branch("education","Education","Formal and informal learning, credentials, and study history.","internal",["education","school","course","degree","student","learning","certification"],["Schools","Courses","Credentials","Learning","Research"]),
 branch("projects","Projects","Personal and professional initiatives, plans, and deliverables.","internal",["project","roadmap","milestone","deliverable","launch","build"],["Active","Planned","Completed","Ideas","Artifacts"]),
 branch("finance","Finance","Income, spending, assets, obligations, taxes, and financial plans.","restricted",["finance","bank","income","revenue","budget","tax","investment","debt"],["Budget","Income","Assets","Accounts","Taxes","Obligations"],["Accounts","Taxes"]),
 branch("home","Home","Residences, household operations, property, and home records.","confidential",["home","house","apartment","address","property","household","utility"],["Places","Household","Property","Utilities","Security"],["Places","Security"]),
 branch("memory","Memory","Episodes, recollections, milestones, and personal timeline.","confidential",["memory","remember","childhood","milestone","journal","diary","timeline"],["Episodes","Timeline","Milestones","Journals","People"]),
 branch("personal-knowledge","Personal Knowledge","Notes, research, ideas, questions, and personal synthesis.","internal",["note","research","idea","insight","question","knowledge","source"],["Notes","Ideas","Research","Questions","Sources"]),
 branch("digital-life","Digital Life","Accounts, devices, online activity, software, and digital assets.","restricted",["digital","account","password","device","email","website","software","online"],["Accounts","Devices","Software","Activity","Credentials"],["Accounts","Credentials"]),
 branch("travel","Travel","Trips, places, itineraries, mobility records, and travel memories.","confidential",["travel","trip","flight","hotel","itinerary","passport","visa","visit"],["Trips","Places","Plans","Bookings","Identity Documents"],["Bookings","Identity Documents"]),
 branch("hobbies","Hobbies","Interests, creative practice, collections, and recreation.","internal",["hobby","music","sport","game","art","collection","recipe","garden"],["Interests","Practice","Collections","Events","Ideas"]),
 branch("goals","Goals","Desired outcomes, commitments, progress, and reviews.","confidential",["goal","objective","habit","progress","resolution","commitment"],["Current","Future","Habits","Progress","Reviews"]),
 branch("civic-community","Civic / Community","Community participation, volunteering, associations, and civic life.","internal",["community","civic","volunteer","association","neighborhood","nonprofit"],["Communities","Organizations","Service","Events","Issues"]),
 branch("legal-administrative","Legal / Administrative","Legal identity, cases, contracts, immigration, and government records.","restricted",["legal","court","lawyer","contract","immigration","government","license","insurance"],["Identity","Cases","Contracts","Government","Insurance"],["Identity","Cases","Contracts"]),
 branch("legacy","Legacy","Estate, values, authored works, lineage, and long-term stewardship.","restricted",["legacy","estate","will","beneficiary","lineage","heritage","archive"],["Estate","Values","Works","Lineage","Stewardship"],["Estate","Lineage"])
] as const;

export const LIFE_TAXONOMY:TaxonomyNode[]=LIFE_BRANCHES.map(x=>({key:x.key,title:x.title,tabs:[{key:"overview",title:"Overview",subtabs:x.subtabs}]}));
export const LIFE_RULES:CorpusRule[]=LIFE_BRANCHES.map(x=>({field:"topic",terms:x.terms,weight:.55,mega_tab:x.key,tab:"overview"}));
const text=(input:ClassificationInput)=>[input.type,input.title,input.summary,...(input.tags??[]),...(input.topics??[]),...(input.verticals??[]),...(input.intents??[])].filter(Boolean).join(" ").toLowerCase();
export function lifeBranchPolicy(megaTab:string,subtab?:string|null){const b=LIFE_BRANCHES.find(x=>x.key===megaTab);if(!b)throw new Error("LIFE_BRANCH_NOT_FOUND");const sealed=!!subtab&&b.sealed_subtabs.map(x=>x.toLowerCase()).includes(subtab.toLowerCase());return{sensitivity:sealed?"sealed":b.sensitivity,visibility:sealed?"sealed":"private" as const};}
export function classifyLife(input:ClassificationInput,threshold=.25){const narrative=text(input);return LIFE_BRANCHES.flatMap(b=>{const hits=b.terms.filter(term=>narrative.includes(term));if(!hits.length)return[];return[{mega_tab:b.key,tab:"overview",subtab:null,confidence:Math.min(.99,Number((.25+hits.length*.12).toFixed(3))),reasons:hits.map(x=>`life:${b.key}:${x}`),...lifeBranchPolicy(b.key)}];}).filter(x=>x.confidence>=threshold).sort((a,b)=>b.confidence-a.confidence||a.mega_tab.localeCompare(b.mega_tab));}
export function lifePolicyDigest(){return createHash("sha256").update(JSON.stringify(LIFE_BRANCHES)).digest("hex");}
