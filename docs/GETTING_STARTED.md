# Getting Started with CERVEL

This guide is the canonical local-development path for contributors working on the CERVEL alpha repository.

The shortest path is intentionally small:

```bash
git clone https://github.com/YannDavidson/cervel.git
cd cervel
npm ci
npm run cervel:dev
```

After CERVEL is running, verify the local alpha path with:

```bash
npm run cervel:verify
```

If startup or local state is unclear, run the read-only doctor:

```bash
npm run cervel:doctor
```

## 1. Requirements

You need:

- Node.js 20 or newer;
- npm;
- Docker with a running daemon;
- access to this repository.

No cloud account or external model API key is required for the default sovereign local path.

## 2. Clone CERVEL

```bash
git clone https://github.com/YannDavidson/cervel.git
cd cervel
```

## 3. Install dependencies

Install exactly from the repository lockfile:

```bash
npm ci
```

## 4. Start CERVEL

Use the canonical development launcher:

```bash
npm run cervel:dev
```

The launcher first runs developer diagnostics. If the existing Local Node is healthy it reuses it. Otherwise it invokes the developer bootstrap, waits for Local Node readiness, and then launches CERVEL Desktop.

On first use, the bootstrap creates `.env` from `.env.example` when needed and creates a developer Vault and developer setup state.

## 5. What starts locally

The default developer path is local-first. The bootstrap and launcher coordinate:

1. a developer CERVEL Vault, by default at `~/.cervel/vaults/developer`;
2. Vault-scoped PostgreSQL 16 + pgvector in Docker;
3. database migrations and idempotent bootstrap;
4. the CERVEL Local Node API, by default on `http://127.0.0.1:8787`;
5. CERVEL Desktop.

Developer orchestration state is stored by default under `~/.cervel/developer`. If CERVEL generates a developer-only Vault passphrase, it is stored at `~/.cervel/developer/bootstrap-passphrase`, outside both the repository and the Vault.

The Desktop is a client of the Local Node. It is not a second knowledge runtime.

## 6. Open CERVEL Desktop

`npm run cervel:dev` launches Desktop automatically after the Local Node is ready.

For focused Desktop work against an already prepared local runtime, the lower-level command remains available:

```bash
npm run desktop:dev
```

Prefer `npm run cervel:dev` for normal development because it checks and prepares the runtime first.

## 7. Capture your first knowledge

In Desktop, use the available alpha capture surfaces to add a note, file, or source to the developer Vault.

The important boundary is that captured knowledge belongs to the CERVEL Vault and Local Node. The Desktop is the interaction surface; it does not become the authoritative knowledge store.

After capture, allow indexing to complete before testing retrieval.

## 8. Ask your first question

Use the Desktop answer/search experience to ask a question that can be answered from the knowledge you just captured.

For the default local path, no external model API key is required. Provider integrations are adapters behind CERVEL's reasoning boundary; they are not the authoritative memory layer.

A successful knowledge path should preserve the relationship between the answer and the source knowledge used to produce it.

## 9. Inspect Trace

Open the Trace/source inspection surface for the answer and confirm that the response can be followed back to its supporting knowledge and provenance.

Trace is part of the CERVEL knowledge contract: answers and reasoning activity should remain inspectable rather than becoming detached from the knowledge that supported them.

## 10. Run verification

Run the canonical developer alpha verification:

```bash
npm run cervel:verify
```

The verifier consumes developer bootstrap state automatically, resolves the Local Node credential in memory, and exercises the developer golden path. It checks the currently implemented verification contract, including Vault creation, Local Node readiness, retrieval, cited answers, Trace completion, intelligence routing, sync convergence, and revocation behavior.

For the detailed verification contract, see [`DEVELOPER_VERIFY.md`](DEVELOPER_VERIFY.md).

## 11. Stop CERVEL

When `npm run cervel:dev` is in the foreground, `Ctrl+C` stops the development launcher and propagates the termination signal to the Desktop child process.

Important lifecycle detail: the launcher does **not** currently promise full teardown of setup-owned infrastructure. The Local Node and its Vault-scoped PostgreSQL container may remain available after the launcher exits.

To explicitly lock the default developer Vault and stop its Local Node/database lifecycle, provide the Vault passphrase and use the Local Node `lock` command. For a bootstrap-generated developer passphrase on macOS/Linux:

```bash
CERVEL_VAULT_PASSPHRASE="$(cat ~/.cervel/developer/bootstrap-passphrase)" \
  npm run --silent cervel -- lock --vault ~/.cervel/vaults/developer
```

If you supplied `CERVEL_VAULT_PASSPHRASE` yourself, use that value instead. Do not paste or commit Vault secrets into repository files.

## 12. Restart CERVEL

Restart with the same canonical command:

```bash
npm run cervel:dev
```

The launcher and bootstrap are designed to reuse an existing developer Vault and healthy Local Node instead of recreating identity or knowledge state.

## 13. Persistence across restarts

The developer Vault is durable state. Restarting the launcher is not intended to recreate the Vault or erase captured knowledge.

The bootstrap reuses the existing Vault, database state, node identity, workspace, principal, and primary storage bootstrap where present. This persistence is part of the local CERVEL development path; reasoning providers remain replaceable dependencies rather than owners of the corpus.

If persistence behavior appears inconsistent, do not delete local state first. Run:

```bash
npm run cervel:doctor
```

and inspect the reported Vault, bootstrap, database, port, and Local Node state.

## 14. Reset the development environment

There is intentionally no canonical one-command destructive reset in the current alpha. `cervel:setup` is idempotent and should normally repair/reuse developer state rather than erase it.

If you truly need a clean environment, first lock the Vault as described above, then remove only the disposable developer Vault and developer orchestration state that you intentionally want to recreate. Treat this as destructive: captured local knowledge in that developer Vault can be lost.

After intentional cleanup, rerun:

```bash
npm run cervel:dev
```

Do not turn manual deletion into a routine troubleshooting step. Prefer `cervel:doctor` first.

## 15. Troubleshooting

Start with:

```bash
npm run cervel:doctor
```

The doctor is read-only. It checks Node.js, npm, Docker, repository configuration, developer setup state, Vault/runtime consistency, PostgreSQL readiness, ports, and Local Node `/ready` without creating, repairing, starting, or stopping resources.

Common prerequisites to check are:

- Node.js is version 20 or newer;
- Docker Desktop/daemon is running;
- repository dependencies were installed with `npm ci`;
- the configured Local Node and database ports are not occupied by unrelated processes;
- `.env` is local and ignored by Git;
- Vault passphrases and runtime credentials have not been copied into the repository.

For deeper diagnostics, see [`DEVELOPER_DOCTOR.md`](DEVELOPER_DOCTOR.md) and [`DEVELOPER_BOOTSTRAP.md`](DEVELOPER_BOOTSTRAP.md).

## 16. Developer lifecycle commands

Normal development should begin with the canonical launcher:

```bash
npm run cervel:dev
```

Lower-level commands remain available when you need a specific lifecycle stage:

```bash
npm run cervel:setup     # bootstrap or reuse the local developer runtime
npm run cervel:doctor    # read-only diagnostics
npm run cervel:verify    # run the developer alpha golden path
npm run desktop:dev      # launch Desktop against a prepared runtime
npm run cervel           # access the lower-level Local Node CLI
```

The lower-level commands are escape hatches for focused development and diagnostics, not prerequisites developers should have to discover before starting CERVEL.

## Related documentation

- [`DEVELOPER_BOOTSTRAP.md`](DEVELOPER_BOOTSTRAP.md) — bootstrap contract and developer state
- [`DEVELOPER_DOCTOR.md`](DEVELOPER_DOCTOR.md) — diagnostic contract
- [`DEVELOPER_VERIFY.md`](DEVELOPER_VERIFY.md) — developer golden-path verification
- [`DESKTOP_ALPHA.md`](DESKTOP_ALPHA.md) — Desktop runtime and security boundary

---

**CERVEL — Persistent Knowledge Infrastructure.**  
**Models reason. CERVEL remembers.**  
**Sovereign by design.**
