# CERVEL Intelligence Gateway

The Intelligence Gateway automatically selects the least-disclosing, least-expensive model that can meet a request's capability and quality threshold. Models remain replaceable workers; the Vault, Context Package, permissions, answer, receipt, and Trace remain authoritative in CERVEL.

## Execution order

1. Classify the request as retrieval, summarization, analysis, coding, multimodal, or long-context work.
2. Determine sensitivity from both the request and locally inspected evidence. The highest classification wins.
3. Apply offline, network, disclosure, capability, context-window, health, quality, per-request, and monthly-budget constraints.
4. Return matching Vault evidence without generation when generation adds no value.
5. Prefer a suitable device-local model; escalate only when its quality or capabilities are insufficient.
6. Execute the ranked provider chain. A failed provider is recorded unhealthy and the next eligible candidate is attempted.
7. Persist a disclosure receipt and budget entry without storing provider credentials or raw evidence.

## Providers

The capability registry covers deterministic local retrieval, Ollama/OpenAI-compatible local runtimes, OpenAI Responses, Anthropic Messages, Gemini GenerateContent, OpenRouter, and private OpenAI-compatible enterprise endpoints. Local discovery uses Ollama's local API; the benchmark endpoint measures first-response latency and generation throughput with a bounded eight-token probe.

## Policy

| Variable | Default | Meaning |
|---|---:|---|
| `CERVEL_OFFLINE_ONLY` | `false` | Prohibits every non-local candidate |
| `CERVEL_ALLOW_MODEL_NETWORK` | `false` | Required before any network model can run |
| `CERVEL_ALLOW_CONFIDENTIAL_EXTERNAL` | `false` | Allows confidential Context Packages to leave the device |
| `CERVEL_ALLOW_RESTRICTED_EXTERNAL` | `false` | Allows restricted Context Packages to leave the device |
| `CERVEL_AI_MONTHLY_BUDGET_USD` | `25` | Principal-scoped monthly ceiling |
| `CERVEL_AI_MAX_REQUEST_USD` | `1` | Maximum estimated cost for one request |
| `CERVEL_AI_QUALITY_FLOOR` | `0.55` | Minimum acceptable provider quality |

Provider credentials are read from the existing OpenAI/Gemini/compatible environment plus `ANTHROPIC_API_KEY` and `OPENROUTER_API_KEY`. Enterprise endpoints require URL, model name, and explicit network permission. Consumer chatbot subscriptions are not treated as API credentials.

## APIs

- `GET /v1/intelligence/providers?node_id=…` lists configured capabilities and discovered local models.
- `POST /v1/intelligence/route` previews a policy decision without executing a model.
- `POST /v1/intelligence/local/benchmark` benchmarks one installed local model.
- `GET /v1/intelligence/receipts?node_id=…` returns principal-scoped disclosure and cost receipts.
- Existing `/v1/reason` and Context Package reasoning automatically use the Gateway.

Every answer returns its routing plan and disclosure-receipt identifier under `intelligence`. Trace and provenance include the receipt for externally generated answers.
