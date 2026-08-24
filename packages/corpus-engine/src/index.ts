import { createHash } from "node:crypto";

export const CORPUS_ENGINE_VERSION = "1.0" as const;
export const BUILTIN_CORPUS_KEYS = ["life", "enterprise", "knowledge", "world", "civilization", "machine", "ai", "experience", "resource"] as const;
export type BuiltinCorpusKey = typeof BUILTIN_CORPUS_KEYS[number];
export type CorpusVisibility = "public" | "node" | "restricted" | "private";
export type TaxonomyNode = { key: string; title: string; tabs: Array<{ key: string; title: string; subtabs: string[] }> };
export type CorpusDefinition = { key: string; title: string; description: string; visibility: CorpusVisibility; taxonomy: TaxonomyNode[]; extension_of?: string | null; rules: CorpusRule[] };
export type CorpusRule = { field: "type" | "title" | "summary" | "language" | "jurisdiction" | "tag" | "topic" | "vertical" | "intent"; terms: string[]; weight: number; mega_tab: string; tab: string; subtab?: string };
export type CorpusCandidate = { corpus_key: string; confidence: number; mega_tab: string; tab: string; subtab: string | null; reasons: string[] };
export type ClassificationInput = { type?: string; title?: string; summary?: string; languages?: string[]; jurisdictions?: string[]; tags?: string[]; topics?: string[]; verticals?: string[]; intents?: string[] };

const taxonomy = (key: string, tabs: string[]): TaxonomyNode[] => [{ key, title: title(key), tabs: tabs.map(tab => ({ key: slug(tab), title: tab, subtabs: [] })) }];
const rule = (field: CorpusRule["field"], terms: string[], mega_tab: string, tab: string, weight = .35): CorpusRule => ({ field, terms, weight, mega_tab, tab });
const title = (value: string) => value.replace(/[_-]/g, " ").replace(/\b\w/g, x => x.toUpperCase());
const slug = (value: string) => value.toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const BUILTIN_CORPORA: readonly CorpusDefinition[] = [
  { key:"life", title:"Life Corpus", description:"Personal continuity, identity, relationships, health, goals, and lived history.", visibility:"private", taxonomy:taxonomy("life",["Identity","People","Health","Goals","Timeline"]), rules:[rule("type",["journal","profile","memory","health"],"life","identity",.55),rule("topic",["family","health","goal","habit","personal"],"life","timeline")] },
  { key:"enterprise", title:"Enterprise Corpus", description:"Organizations, operations, strategy, customers, finance, and institutional memory.", visibility:"restricted", taxonomy:taxonomy("enterprise",["Strategy","Operations","Customers","Finance","People"]), rules:[rule("vertical",["finance","legal","software","healthcare"],"enterprise","strategy",.45),rule("topic",["business","revenue","customer","contract","company","project"],"enterprise","operations")] },
  { key:"knowledge", title:"Knowledge Corpus", description:"Claims, concepts, research, evidence, sources, and synthesized understanding.", visibility:"node", taxonomy:taxonomy("knowledge",["Concepts","Claims","Research","Sources","Questions"]), rules:[rule("type",["claim","research","note","source","paper"],"knowledge","concepts",.5),rule("intent",["research","question"],"knowledge","research",.4)] },
  { key:"world", title:"World Corpus", description:"Places, events, institutions, systems, and current world state.", visibility:"node", taxonomy:taxonomy("world",["Places","Events","Institutions","Systems","Signals"]), rules:[rule("type",["event","place","institution"],"world","events",.5),rule("topic",["country","city","global","government","economy"],"world","systems")] },
  { key:"civilization", title:"Civilization Corpus", description:"Historical eras, cultures, societies, ideas, and long-duration human development.", visibility:"node", taxonomy:taxonomy("civilization",["Eras","Cultures","Societies","Ideas","Heritage"]), rules:[rule("type",["history","archive","culture"],"civilization","eras",.5),rule("topic",["history","civilization","culture","heritage","ancient"],"civilization","heritage")] },
  { key:"machine", title:"Machine Corpus", description:"Devices, software, infrastructure, agents, telemetry, and operational state.", visibility:"restricted", taxonomy:taxonomy("machine",["Systems","Software","Devices","Agents","Telemetry"]), rules:[rule("type",["code","repository","device","telemetry"],"machine","systems",.5),rule("topic",["runtime","database","deployment","api","device"],"machine","software")] },
  { key:"ai", title:"AI Corpus", description:"Models, prompts, evaluations, reasoning, datasets, and AI interactions.", visibility:"restricted", taxonomy:taxonomy("ai",["Models","Prompts","Evaluations","Datasets","Sessions"]), rules:[rule("type",["prompt","model","evaluation","conversation"],"ai","sessions",.5),rule("topic",["model","llm","ai","inference","embedding"],"ai","models")] },
  { key:"experience", title:"Experience Corpus", description:"Episodes, observations, interactions, media, and experiential traces.", visibility:"private", taxonomy:taxonomy("experience",["Episodes","Observations","Interactions","Media","Places"]), rules:[rule("type",["episode","capture","photo","audio","video"],"experience","episodes",.5),rule("topic",["experience","observation","visit","conversation"],"experience","observations")] },
  { key:"resource", title:"Resource Corpus", description:"Reusable files, tools, references, templates, links, and assets.", visibility:"node", taxonomy:taxonomy("resource",["Files","Links","Tools","Templates","Assets"]), rules:[rule("type",["file","link","template","asset","document"],"resource","files",.5),rule("intent",["create"],"resource","templates",.25)] }
] as const;

const normalize = (value: unknown) => Array.isArray(value) ? value.join(" ").toLowerCase() : String(value ?? "").toLowerCase();
export function validateCorpusDefinition(definition: CorpusDefinition): CorpusDefinition {
  if (!/^[a-z][a-z0-9-]{1,63}$/.test(definition.key)) throw new Error("CORPUS_KEY_INVALID");
  if (!definition.title?.trim() || !definition.description?.trim()) throw new Error("CORPUS_METADATA_REQUIRED");
  if (!["public","node","restricted","private"].includes(definition.visibility)) throw new Error("CORPUS_VISIBILITY_INVALID");
  if (!definition.taxonomy.length || definition.taxonomy.some(m => !m.key || !m.tabs.length)) throw new Error("CORPUS_TAXONOMY_INVALID");
  return definition;
}
export function classifyForCorpora(input: ClassificationInput, definitions: readonly CorpusDefinition[] = BUILTIN_CORPORA, threshold = .3): CorpusCandidate[] {
  const fields: Record<CorpusRule["field"], string> = { type:normalize(input.type), title:normalize(input.title), summary:normalize(input.summary), language:normalize(input.languages), jurisdiction:normalize(input.jurisdictions), tag:normalize(input.tags), topic:normalize(input.topics), vertical:normalize(input.verticals), intent:normalize(input.intents) };
  return definitions.flatMap(def => {
    let score = 0; const reasons: string[] = []; let coordinate: CorpusRule | undefined;
    for (const r of def.rules) { const hits = r.terms.filter(term => fields[r.field].includes(term.toLowerCase())); if (hits.length) { score += Math.min(r.weight, r.weight * hits.length); reasons.push(`${r.field}:${hits.join(",")}`); coordinate ??= r; } }
    if (!coordinate || score < threshold) return [];
    return [{ corpus_key:def.key, confidence:Math.min(.99, Number(score.toFixed(3))), mega_tab:coordinate.mega_tab, tab:coordinate.tab, subtab:coordinate.subtab ?? null, reasons }];
  }).sort((a,b) => b.confidence-a.confidence || a.corpus_key.localeCompare(b.corpus_key));
}
export function corpusRegistryDigest(definitions: readonly CorpusDefinition[] = BUILTIN_CORPORA): string { return createHash("sha256").update(JSON.stringify(definitions)).digest("hex"); }
