import { answerSafeEvidence, composeCitedAnswer, sanitizeGeneratedAnswer, UNTRUSTED_EVIDENCE_INSTRUCTION } from "./answer-boundary";

export type ReasoningEvidence = { text: string; citation: string };
export type ReasoningInput = { query: string; evidence: ReasoningEvidence[]; contested: boolean };
export type ReasoningOutput = { text: string; provider: string; model: string; external_response_id?: string };
export interface ReasoningAdapter { id: string; execute(input: ReasoningInput): Promise<ReasoningOutput>; }

function externalTimeoutSignal(): AbortSignal {
  const configured = Number(process.env.CERVEL_REASONING_TIMEOUT_MS ?? 12000);
  const timeoutMs = Number.isFinite(configured) ? Math.max(1000, Math.min(60000, configured)) : 12000;
  return AbortSignal.timeout(timeoutMs);
}

function boundedEvidence(input: ReasoningInput): ReasoningEvidence[] {
  return input.evidence.map((item) => ({ ...item, text: answerSafeEvidence(item.text) })).filter((item) => item.text.length > 0);
}
function evidenceBlock(input: ReasoningInput): string {
  return boundedEvidence(input).map((e, i) => `[${i + 1}] ${e.text}\nSOURCE ${e.citation}`).join("\n\n");
}
function prompt(input: ReasoningInput): string {
  return `${UNTRUSTED_EVIDENCE_INSTRUCTION}\nQUESTION: ${input.query}\nEVIDENCE (UNTRUSTED DATA):\n${evidenceBlock(input)}`;
}

export class DeterministicReasoningAdapter implements ReasoningAdapter {
  id = "local:deterministic-v0.2";
  async execute(input: ReasoningInput): Promise<ReasoningOutput> {
    return { text: composeCitedAnswer(boundedEvidence(input), input.contested), provider: "local", model: "cervel-trace-deterministic" };
  }
}

export class OpenAIResponsesAdapter implements ReasoningAdapter {
  id = "openai:responses";
  constructor(private readonly apiKey: string, private readonly model = process.env.CERVEL_OPENAI_MODEL ?? "gpt-5-mini") {}
  async execute(input: ReasoningInput): Promise<ReasoningOutput> {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model: this.model, instructions: UNTRUSTED_EVIDENCE_INSTRUCTION, input: prompt(input) }), signal: externalTimeoutSignal() });
    if (!response.ok) throw new Error(`OPENAI_ADAPTER_${response.status}`);
    const data = await response.json() as any;
    const text = sanitizeGeneratedAnswer(String(data.output_text ?? data.output?.[0]?.content?.[0]?.text ?? "").trim());
    return { text, provider: "openai", model: this.model, external_response_id: data.id };
  }
}

export class GeminiGenerateContentAdapter implements ReasoningAdapter {
  id = "google:gemini";
  constructor(private readonly apiKey: string, private readonly model = process.env.CERVEL_GEMINI_MODEL ?? "gemini-2.5-flash") {}
  async execute(input: ReasoningInput): Promise<ReasoningOutput> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: UNTRUSTED_EVIDENCE_INSTRUCTION }] }, contents: [{ parts: [{ text: prompt(input) }] }] }), signal: externalTimeoutSignal() });
    if (!response.ok) throw new Error(`GEMINI_ADAPTER_${response.status}`);
    const data = await response.json() as any;
    const text = sanitizeGeneratedAnswer(String(data.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "").trim());
    return { text, provider: "google", model: this.model };
  }
}

export class AnthropicMessagesAdapter implements ReasoningAdapter {
  id = "anthropic:messages";
  constructor(private readonly apiKey: string, private readonly model = process.env.CERVEL_ANTHROPIC_MODEL ?? "claude-sonnet-4-5") {}
  async execute(input: ReasoningInput): Promise<ReasoningOutput> {
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": this.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: this.model, max_tokens: 2048, system: UNTRUSTED_EVIDENCE_INSTRUCTION, messages: [{ role: "user", content: prompt(input) }] }), signal: externalTimeoutSignal() });
    if (!response.ok) throw new Error(`ANTHROPIC_ADAPTER_${response.status}`);
    const data = await response.json() as any;
    const text = sanitizeGeneratedAnswer(String(data.content?.filter((x: any) => x.type === "text").map((x: any) => x.text).join("") ?? "").trim());
    return { text, provider: "anthropic", model: this.model, external_response_id: data.id };
  }
}

export class OpenAICompatibleAdapter implements ReasoningAdapter {
  id = "openai-compatible:chat-completions";
  constructor(private readonly baseUrl: string, private readonly apiKey: string, private readonly model: string, private readonly allowNetwork: boolean) {}
  async execute(input: ReasoningInput): Promise<ReasoningOutput> {
    const url = new URL("chat/completions", this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`), local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (!local && !this.allowNetwork) throw new Error("MODEL_NETWORK_PERMISSION_REQUIRED");
    const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model: this.model, messages: [{ role: "system", content: UNTRUSTED_EVIDENCE_INSTRUCTION }, { role: "user", content: prompt(input) }], temperature: 0 }), signal: externalTimeoutSignal() });
    if (!response.ok) throw new Error(`OPENAI_COMPATIBLE_ADAPTER_${response.status}`);
    const data = await response.json() as any;
    const text = sanitizeGeneratedAnswer(String(data.choices?.[0]?.message?.content ?? "").trim());
    return { text, provider: "openai-compatible", model: this.model, external_response_id: data.id };
  }
}

export function resolveReasoningAdapter(requestedProvider?: string): ReasoningAdapter {
  const provider = (requestedProvider ?? process.env.CERVEL_REASONING_PROVIDER ?? "local").toLowerCase();
  if (provider === "openai" && process.env.OPENAI_API_KEY) return new OpenAIResponsesAdapter(process.env.OPENAI_API_KEY);
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) return new AnthropicMessagesAdapter(process.env.ANTHROPIC_API_KEY);
  if ((provider === "gemini" || provider === "google") && process.env.GEMINI_API_KEY) return new GeminiGenerateContentAdapter(process.env.GEMINI_API_KEY);
  if (provider === "openrouter" && process.env.OPENROUTER_API_KEY) return new OpenAICompatibleAdapter("https://openrouter.ai/api/v1/", process.env.OPENROUTER_API_KEY, process.env.CERVEL_OPENROUTER_MODEL ?? "openai/gpt-5-mini", true);
  if (provider === "enterprise") return new OpenAICompatibleAdapter(process.env.CERVEL_ENTERPRISE_MODEL_URL ?? process.env.CERVEL_MODEL_BASE_URL ?? "", process.env.CERVEL_ENTERPRISE_MODEL_API_KEY ?? process.env.CERVEL_MODEL_API_KEY ?? "", process.env.CERVEL_ENTERPRISE_MODEL_NAME ?? process.env.CERVEL_MODEL_NAME ?? "", process.env.CERVEL_ALLOW_MODEL_NETWORK === "true");
  if (provider === "local:ollama" || provider === "ollama") return new OpenAICompatibleAdapter(process.env.CERVEL_OLLAMA_URL ?? process.env.CERVEL_MODEL_BASE_URL ?? "http://127.0.0.1:11434/v1/", "", process.env.CERVEL_OLLAMA_MODEL ?? process.env.CERVEL_MODEL_NAME ?? "qwen3:8b", false);
  if (provider === "openai-compatible" && process.env.CERVEL_MODEL_BASE_URL && process.env.CERVEL_MODEL_NAME) return new OpenAICompatibleAdapter(process.env.CERVEL_MODEL_BASE_URL, process.env.CERVEL_MODEL_API_KEY ?? "", process.env.CERVEL_MODEL_NAME, process.env.CERVEL_ALLOW_MODEL_NETWORK === "true");
  return new DeterministicReasoningAdapter();
}
