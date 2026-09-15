# CERVEL

**Persistent Knowledge Infrastructure for humans, AI, and machines — sovereign by design.**

> **Models reason. CERVEL remembers.**

CERVEL is a model-independent knowledge infrastructure layer designed to keep knowledge persistent, addressable, permission-aware, provenance-rich, and usable across changing AI models, agents, applications, and execution environments.

This repository contains the current CERVEL alpha implementation. It includes a runnable Local Node and API, cross-platform Desktop Alpha, ingestion and retrieval pipelines, context compilation, reasoning gateways, Trace and provenance, corpus runtimes, external agent interfaces, cloud-sync foundations, capture surfaces, and executable conformance and golden-path tests.

## Quick start — four lines from GitHub to CERVEL

Prerequisites: Node.js 20+, npm, and Docker with a running daemon.

```bash
git clone https://github.com/YannDavidson/cervel.git
cd cervel
npm ci
npm run cervel:dev
```

`npm run cervel:dev` is the canonical development launcher. It runs diagnostics, bootstraps the developer environment when necessary, starts local infrastructure and the Local Node, waits for readiness, and launches CERVEL Desktop.

```text
cervel:doctor
     ↓
bootstrap if necessary
     ↓
start infrastructure
     ↓
start Local Node
     ↓
wait for readiness
     ↓
start Desktop
```

No cloud account or external model API key is required for the default sovereign local path. Existing developer Vault state is reused rather than recreated.

## Why CERVEL exists

AI systems are increasingly capable of reasoning and acting, but organizational and personal knowledge is still commonly trapped inside applications, conversations, model-specific memory, vector stores, and provider boundaries.

CERVEL separates **knowledge persistence** from **reasoning**.

The knowledge layer preserves durable identity, provenance, permissions, relationships, authority, temporal context, and history. Reasoning providers sit behind controlled interfaces and can change without becoming the permanent owner of the knowledge they use.

```text
Knowledge / Sources
       ↓
CERVEL Corpus + CKOs
       ↓
Permission-aware activation
       ↓
Knowledge Compiler / CCP
       ↓
Intelligence Gateway
       ↓
Models + Agents
       ↓
Answers / Actions / Trace
       ↓
Governed knowledge write-back
```

## What is implemented today

### Core knowledge contracts

- CERVEL Knowledge Object (CKO) schema
- CKURI stable knowledge identity
- Claims and relationships
- Provenance events
- Context Compilation Package (CCP)
- permission and policy contracts
- PostgreSQL persistence and migrations

### Local Node + API

The Local Node is the sovereign runtime boundary for a CERVEL Vault. It owns knowledge objects, encrypted artifacts, ingestion, indexing, retrieval, reasoning orchestration, provenance, graph semantics, Context Packages, answers, and Trace.

The repository includes a TypeScript/Node API, Local Node CLI, PostgreSQL + pgvector persistence, S3-compatible object storage support, migration/bootstrap tooling, workers, and runtime health paths.

### CERVEL Desktop Alpha

CERVEL Desktop is a sandboxed Electron client for the Local Node, not a second knowledge runtime.

Current alpha surfaces include encrypted Vault onboarding and lifecycle; notes, files, sources, and drag-and-drop ingestion; scoped hybrid search; cited local answers; answer-to-source Trace inspection; semantic graph views; node health and indexing visibility; backup, restore, and verification; provider privacy controls; deterministic offline reasoning and local/OpenAI-compatible provider configuration; tray operation and crash recovery.

See [`docs/DESKTOP_ALPHA.md`](docs/DESKTOP_ALPHA.md) for the Desktop security and runtime boundary.

### Knowledge and intelligence runtime

The repository also contains foundations and tests for Intelligence Gateway, Knowledge Compiler, semantic kernel, Deliverables Engine, Corpus Engine, Life Corpus runtime, Enterprise Corpus runtime, external AI / Agent Gateway, MCP server, cloud sync, browser capture extension, mobile capture, and source synchronization. These surfaces are at different alpha maturity levels. Presence in the repository should not be interpreted as production readiness.

## Core invariant

> **Knowledge identity is independent from storage and model providers.**

A model is a reasoning dependency. It is not the authoritative memory layer. CERVEL is designed so that a knowledge object can retain its identity, provenance, permissions, relationships, and history even when storage locations, applications, agents, or reasoning models change.

## Agent knowledge firewall

CERVEL treats AI access to persistent knowledge as a governed boundary.

```text
READ
principal / agent
  → policy scope
  → authorized knowledge universe
  → retrieval
  → ranking
  → CCP
  → model / agent

WRITE
model / agent output
  → candidate knowledge
  → admission policy
  → Accept / Reject / Quarantine / Supersede / Non-authoritative
  → persistent corpus
```

### Non-negotiable security rule

**Never retrieve globally and filter unauthorized content afterward.** Authorization constrains the knowledge universe *before* retrieval.

## Local development

The one-command launcher above is the normal developer path. Lower-level lifecycle tools remain available for diagnostics and focused work:

```bash
npm run cervel:doctor
npm run cervel:setup
npm run cervel:verify
npm run desktop:dev
```

`cervel:setup` creates `.env` from `.env.example` when needed, creates or reuses a developer Vault, manages a developer-only Vault passphrase outside the repository, starts PostgreSQL + pgvector, applies migrations/bootstrap, starts the Local Node, waits for `/ready`, and records non-secret runtime identity for developer tooling.

`cervel:doctor` is read-only diagnostics. `cervel:verify` runs the developer alpha golden path using bootstrap state automatically. These are supporting tools; `cervel:dev` is the canonical launcher.

See [`docs/DEVELOPER_BOOTSTRAP.md`](docs/DEVELOPER_BOOTSTRAP.md), [`docs/DEVELOPER_DOCTOR.md`](docs/DEVELOPER_DOCTOR.md), and [`docs/DEVELOPER_VERIFY.md`](docs/DEVELOPER_VERIFY.md) for detailed contracts and troubleshooting.

### API development

```bash
npm run dev:api
```

### Local Node CLI

```bash
npm run cervel
```

### Database

The developer launcher/bootstrap normally owns local database startup, migration, and bootstrap. Lower-level commands remain available:

```bash
npm run db:migrate
npm run db:bootstrap
```

The default local configuration is documented in [`.env.example`](.env.example). Do not commit real credentials or provider secrets.

## Verification

```bash
npm run cervel:verify
```

The repository also includes lower-level contract, runtime, integration, and alpha-path test suites. Useful entry points include:

```bash
npm test
npm run test:contracts
npm run test:ckuri
npm run test:vault
npm run test:desktop
npm run test:golden-path
npm run test:intelligence-gateway
npm run test:knowledge-compiler
npm run test:external-gateway
npm run test:semantic-kernel
npm run test:corpus-engine
npm run test:life-corpus
npm run test:enterprise-corpus
npm run test:corpus-demo
npm run alpha:golden-path
```

Passing tests establish the behavior covered by those tests; they are not a claim of general production readiness.

## Repository map

```text
apps/       Runtime applications and user-facing surfaces
db/         Database schema and migrations
docs/       Architecture, runtime, security, and alpha documentation
config/     Runtime configuration
workers/    Background processing and synchronization
scripts/    Bootstrap, migration, smoke, build, and verification tooling
tests/      Contract, conformance, integration, and runtime tests
infra/      Infrastructure definitions
deploy/     Deployment configuration
fixtures/   Test and conformance fixtures
```

## Architectural status

CERVEL is under active alpha development. The current objective is to prove a complete sovereign knowledge loop:

```text
Capture source
  → create stable CKO / CKURI
  → preserve provenance
  → enforce permission-scoped activation
  → retrieve relevant knowledge
  → compile CCP
  → invoke a replaceable reasoning provider
  → return cited output
  → inspect Trace
  → govern candidate knowledge before persistence
```

The architecture is intentionally model-independent. Integrations with particular AI providers are adapters, not ownership boundaries for the corpus.

## Security posture

CERVEL is being designed around sovereign-by-design principles including permission-first retrieval, encrypted Vault boundaries, explicit disclosure controls, provenance and Trace, sandboxed Desktop renderer boundaries, loopback authentication for Local Node access, encrypted provider configuration, controlled agent read/write boundaries, and model/provider replaceability.

See the documentation under [`docs/`](docs/) for implementation-specific details and current limitations.

## Project status

**Version:** `0.1.0` alpha development  
**Organization:** CSIX AI LABS LLC  
**Repository:** CERVEL persistent knowledge infrastructure

CERVEL is currently intended for development, technical evaluation, architecture validation, and controlled alpha testing. It should not yet be treated as a production-ready knowledge system.

---

**CERVEL — Persistent Knowledge Infrastructure.**  
**Models reason. CERVEL remembers.**  
**Sovereign by design.**
