export type ReasoningEvidence = { text: string; citation: string };
export type ReasoningInput = { query: string; evidence: ReasoningEvidence[]; contested: boolean };
export type ReasoningOutput = { text: string; provider: string; model: string; external_response_id?: string };

export interface ReasoningAdapter {
  id: string;
  execute(input: ReasoningInput): Promise<ReasoningOutput>;
}

function externalTimeoutSignal(): AbortSignal {
  const configured = Number(process.env.CERVEL_REASONING_TIMEOUT_MS ?? 12000);
  const timeoutMs = Number.isFinite(configured) ? Math.max(1000, Math.min(60000, configured)) : 12000;
  return AbortSignal.timeout(timeoutMs);
}

export class DeterministicReasoningAdapter implements ReasoningAdapter {
  id = "local:deterministic-v0.1";
  async execute(input: ReasoningInput): Promise<ReasoningOutput> {
    const body = input.evidence.slice(0, 4).map((item, i) => `${item.text.trim()} [${i + 1}]`).join(" ");
    const conflict = input.contested ? " Conflicting evidence is present; treat this answer as contested." : "";
    return { text: body ? `${body}${conflict}` : "No authorized evidence was available to answer this request.", provider: "local", model: "cervel-trace-deterministic" };
  }
}

export class OpenAIResponsesAdapter implements ReasoningAdapter {
  id = "openai:responses";
  constructor(private readonly apiKey: string, private readonly model = process.env.CERVEL_OPENAI_MODEL ?? "gpt-5-mini") {}
  async execute(input: ReasoningInput): Promise<ReasoningOutput> {
    const evidence = input.evidence.map((e, i) => `[${i + 1}] ${e.text}\nSOURCE ${e.citation}`).join("\n\n");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "authorization": `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: this.model, input: `Answer only from the supplied evidence. Cite evidence with [n].\nQUESTION: ${input.query}\nEVIDENCE:\n${evidence}` }),
      signal: externalTimeoutSignal()
    });
    if (!response.ok) throw new Error(`OPENAI_ADAPTER_${response.status}`);
    const data = await response.json() as any;
    const text = String(data.output_text ?? data.output?.[0]?.content?.[0]?.text ?? "").trim();
    if (!text) throw new Error("OPENAI_ADAPTER_EMPTY_RESPONSE");
    return { text, provider: "openai", model: this.model, external_response_id: data.id };
  }
}

export class GeminiGenerateContentAdapter implements ReasoningAdapter {
  id = "google:gemini";
  constructor(private readonly apiKey: string, private readonly model = process.env.CERVEL_GEMINI_MODEL ?? "gemini-2.5-flash") {}
  async execute(input: ReasoningInput): Promise<ReasoningOutput> {
    const evidence = input.evidence.map((e, i) => `[${i + 1}] ${e.text}\nSOURCE ${e.citation}`).join("\n\n");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: `Answer only from the supplied evidence. Cite evidence with [n].\nQUESTION: ${input.query}\nEVIDENCE:\n${evidence}` }] }] }),
      signal: externalTimeoutSignal()
    });
    if (!response.ok) throw new Error(`GEMINI_ADAPTER_${response.status}`);
    const data = await response.json() as any;
    const text = String(data.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "").trim();
    if (!text) throw new Error("GEMINI_ADAPTER_EMPTY_RESPONSE");
    return { text, provider: "google", model: this.model };
  }
}

export class OpenAICompatibleAdapter implements ReasoningAdapter {
  id = "openai-compatible:chat-completions";
  constructor(private readonly baseUrl:string,private readonly apiKey:string,private readonly model:string,private readonly allowNetwork:boolean){}
  async execute(input:ReasoningInput):Promise<ReasoningOutput>{
    const url=new URL("chat/completions",this.baseUrl.endsWith("/")?this.baseUrl:`${this.baseUrl}/`),local=["localhost","127.0.0.1","::1"].includes(url.hostname);
    if(!local&&!this.allowNetwork)throw new Error("MODEL_NETWORK_PERMISSION_REQUIRED");
    const evidence=input.evidence.map((e,i)=>`[${i+1}] ${e.text}\nSOURCE ${e.citation}`).join("\n\n"),response=await fetch(url,{method:"POST",headers:{"authorization":`Bearer ${this.apiKey}`,"content-type":"application/json"},body:JSON.stringify({model:this.model,messages:[{role:"system",content:"Answer only from supplied evidence and cite it with [n]."},{role:"user",content:`QUESTION: ${input.query}\nEVIDENCE:\n${evidence}`}],temperature:0}),signal:externalTimeoutSignal()});
    if(!response.ok)throw new Error(`OPENAI_COMPATIBLE_ADAPTER_${response.status}`);const data=await response.json() as any,text=String(data.choices?.[0]?.message?.content??"").trim();if(!text)throw new Error("OPENAI_COMPATIBLE_ADAPTER_EMPTY_RESPONSE");return {text,provider:"openai-compatible",model:this.model,external_response_id:data.id};
  }
}

export function resolveReasoningAdapter(): ReasoningAdapter {
  const provider = (process.env.CERVEL_REASONING_PROVIDER ?? "local").toLowerCase();
  if (provider === "openai" && process.env.OPENAI_API_KEY) return new OpenAIResponsesAdapter(process.env.OPENAI_API_KEY);
  if ((provider === "gemini" || provider === "google") && process.env.GEMINI_API_KEY) return new GeminiGenerateContentAdapter(process.env.GEMINI_API_KEY);
  if(provider==="openai-compatible"&&process.env.CERVEL_MODEL_BASE_URL&&process.env.CERVEL_MODEL_NAME)return new OpenAICompatibleAdapter(process.env.CERVEL_MODEL_BASE_URL,process.env.CERVEL_MODEL_API_KEY??"",process.env.CERVEL_MODEL_NAME,process.env.CERVEL_ALLOW_MODEL_NETWORK==="true");
  return new DeterministicReasoningAdapter();
}
