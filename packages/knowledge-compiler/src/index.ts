import { createHash } from "node:crypto";

export type CompilationMode="automatic"|"review"|"session_only";
export type CandidateKind="claim"|"decision"|"task"|"insight"|"unresolved_question";
export type ConversationTurn={role:"user"|"assistant"|"system";content:string;answer_id?:string|null;source_cko_ids?:string[]};
export type Classification={topics:string[];projects:string[];verticals:string[];entities:string[];intents:string[]};
export type CompilationCandidate={kind:CandidateKind;text:string;fingerprint:string;semantic_key:string;polarity:"positive"|"negative";confidence:number;source_turn_ordinals:number[];duplicate_count:number};
export type FilingSuggestion={path:string;title:string;reason:string};
export type CompilationPlan={input_digest:string;classification:Classification;candidates:CompilationCandidate[];contradictions:{left_fingerprint:string;right_fingerprint:string}[];filing_suggestions:FilingSuggestion[]};

const stop=new Set("a an and are as at be been by for from has have i in is it of on or that the their this to was we were will with you your our about into can could should would".split(" "));
const verticalTerms:Record<string,string[]>={software:["software","api","code","runtime","database","deployment"],research:["research","evidence","source","study"],finance:["finance","revenue","budget","cost","investment"],legal:["legal","contract","compliance","law"],healthcare:["health","patient","clinical","medical"],education:["learning","course","student","education"]};
const intentTerms:Record<string,RegExp>={decide:/\b(decid(?:e|ed)|chose|choice)\b/i,plan:/\b(plan|roadmap|next|will)\b/i,create:/\b(create|build|write|produce|implement)\b/i,research:/\b(research|investigate|compare|evidence)\b/i,question:/\?|\b(why|how|what|whether)\b/i};
const normalize=(s:string)=>s.toLowerCase().normalize("NFKC").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const semantic=(s:string)=>normalize(s).split(" ").filter(x=>!["not","no","never","cannot","without","isn","isnt","don","dont"].includes(x)).join(" ");
const polarity=(s:string):"positive"|"negative"=>/\b(not|no|never|cannot|can't|without|isn't|don't)\b/i.test(s)?"negative":"positive";

function classify(turns:ConversationTurn[]):Classification{
 const text=turns.map(t=>t.content).join("\n"),norm=normalize(text),counts=new Map<string,number>();
 for(const word of norm.split(" "))if(word.length>3&&!stop.has(word))counts.set(word,(counts.get(word)??0)+1);
 const topics=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8).map(x=>x[0]);
 const entities=[...new Set([...text.matchAll(/\b(?:[A-Z][A-Za-z0-9-]+)(?:\s+[A-Z][A-Za-z0-9-]+){0,2}\b/g)].map(m=>m[0]).filter(x=>!/^I$/.test(x)))].slice(0,12);
 const namedProjects=[...text.matchAll(/\bproject\s+([A-Za-z0-9][A-Za-z0-9 _-]{1,40})/gi)].map(m=>m[1].trim().split(/[.!?\n]/)[0]);
 const projects=[...new Set([...namedProjects,...entities.filter(x=>/CERVEL|Project/i.test(x))])].slice(0,8);
 const verticals=Object.entries(verticalTerms).filter(([,terms])=>terms.some(x=>norm.includes(x))).map(([v])=>v);
 const intents=Object.entries(intentTerms).filter(([,re])=>re.test(text)).map(([v])=>v);
 return{topics,projects,verticals,entities,intents};
}
function kindFor(s:string):CandidateKind{
 if(/\?$|\b(open|unresolved) question\b/i.test(s))return"unresolved_question";
 if(/\b(decision|decided|we chose|will prioritize)\b/i.test(s))return"decision";
 if(/\b(todo|action item|need to|must|should|follow up)\b/i.test(s))return"task";
 if(/\b(insight|we learned|this means|realized?)\b/i.test(s))return"insight";
 return"claim";
}
export function compileConversation(turns:ConversationTurn[]):CompilationPlan{
 if(!turns.length)throw new Error("COMPILER_SESSION_EMPTY");
 const found=new Map<string,CompilationCandidate>();
 turns.forEach((turn,ordinal)=>turn.content.split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(x=>x.length>=12).forEach(text=>{
   const kind=kindFor(text),fingerprint=hash(`${kind}:${normalize(text)}`),existing=found.get(fingerprint);
   if(existing){existing.duplicate_count++;if(!existing.source_turn_ordinals.includes(ordinal))existing.source_turn_ordinals.push(ordinal);return;}
   found.set(fingerprint,{kind,text,fingerprint,semantic_key:hash(`${kind}:${semantic(text)}`),polarity:polarity(text),confidence:kind==="claim"?.72:.84,source_turn_ordinals:[ordinal],duplicate_count:0});
 }));
 const candidates=[...found.values()],contradictions:CompilationPlan["contradictions"]=[];
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++)if(candidates[i].semantic_key===candidates[j].semantic_key&&candidates[i].polarity!==candidates[j].polarity)contradictions.push({left_fingerprint:candidates[i].fingerprint,right_fingerprint:candidates[j].fingerprint});
 const classification=classify(turns),anchor=classification.projects[0]??classification.topics[0]??"Inbox";
 const filing_suggestions=[{path:`Knowledge/${anchor}`,title:`${anchor} knowledge`,reason:"Primary project or topic detected from the conversation"}];
 return{input_digest:hash(JSON.stringify(turns.map(t=>({role:t.role,content:t.content,answer_id:t.answer_id??null,source_cko_ids:t.source_cko_ids??[]})))),classification,candidates,contradictions,filing_suggestions};
}
