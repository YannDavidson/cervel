import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

type BootstrapRecord = {
  event: string;
  nodeId: string;
  workspaceId: string;
  principalId: string;
  storageLocationId: string;
  authority: string;
};

type SetupState = {
  format: "cervel-developer-setup/v0.1";
  vault: string;
  url: string;
  node_id: string;
  workspace_id: string;
  principal_id: string;
  storage_location_id: string;
  authority: string;
  passphrase_source: "environment" | "generated-local-file";
  updated_at: string;
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const repoRoot = process.cwd();
const vaultRoot = resolve(process.env.CERVEL_DEV_VAULT ?? join(homedir(), ".cervel", "vaults", "developer"));
const stateRoot = resolve(process.env.CERVEL_DEV_STATE_DIR ?? join(homedir(), ".cervel", "developer"));
const passphrasePath = join(stateRoot, "bootstrap-passphrase");
const setupStatePath = join(stateRoot, "setup.json");
const localUrl = `http://127.0.0.1:${process.env.CERVEL_DEV_PORT ?? "8787"}`;

const exists = async (path: string) => stat(path).then(() => true).catch(() => false);

function fail(message: string, fix?: string): never {
  console.error(`\n✗ ${message}`);
  if (fix) console.error(`\nFix:\n${fix}`);
  process.exit(1);
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv, capture = false) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error) fail(`${command} could not be executed: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = capture ? String(result.stderr || result.stdout || "").trim() : "";
    fail(`${command} failed${detail ? `: ${detail}` : ` with exit code ${result.status}`}`);
  }
  return result;
}

function assertPrerequisites() {
  const major = Number(process.versions.node.split(".")[0]);
  if (!Number.isFinite(major) || major < 20) {
    fail(`Node.js ${process.versions.node} is not supported by the developer bootstrap.`, "Install Node.js 20 or newer, then rerun: npm run cervel:setup");
  }
  console.log(`✓ Node.js ${process.versions.node}`);

  const npm = run(npmCommand, ["--version"], process.env, true);
  console.log(`✓ npm ${String(npm.stdout).trim()}`);

  const docker = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], { encoding: "utf8" });
  if (docker.error || docker.status !== 0) {
    fail("Docker is not available or the Docker daemon is not running.", "Install/start Docker Desktop (or a compatible Docker daemon), then rerun: npm run cervel:setup");
  }
  console.log(`✓ Docker ${String(docker.stdout).trim()}`);
}

async function ensureEnvFile() {
  const envPath = join(repoRoot, ".env");
  if (await exists(envPath)) {
    console.log("✓ .env already exists");
    return;
  }
  const example = join(repoRoot, ".env.example");
  if (!(await exists(example))) fail(".env.example is missing from the repository.");
  await copyFile(example, envPath);
  console.log("✓ Created .env from .env.example");
}

async function developerPassphrase(): Promise<{ value: string; source: SetupState["passphrase_source"] }> {
  const supplied = process.env.CERVEL_VAULT_PASSPHRASE?.trim();
  if (supplied) return { value: supplied, source: "environment" };

  await mkdir(stateRoot, { recursive: true, mode: 0o700 });
  if (await exists(passphrasePath)) {
    return { value: (await readFile(passphrasePath, "utf8")).trim(), source: "generated-local-file" };
  }

  const generated = `cervel-dev-${randomBytes(32).toString("base64url")}`;
  await writeFile(passphrasePath, `${generated}\n`, { mode: 0o600 });
  console.log(`✓ Generated a developer-only Vault passphrase at ${passphrasePath}`);
  console.log("  The passphrase is stored outside the Vault and is never written to the repository.");
  return { value: generated, source: "generated-local-file" };
}

function cervelArgs(command: string[]) {
  return ["run", "cervel", "--", ...command];
}

async function ensureVault(env: NodeJS.ProcessEnv) {
  if (await exists(join(vaultRoot, "vault.json"))) {
    console.log(`✓ Reusing developer Vault ${vaultRoot}`);
    return;
  }
  await mkdir(resolve(vaultRoot, ".."), { recursive: true, mode: 0o700 });
  run(npmCommand, cervelArgs(["init", "--vault", vaultRoot, "--name", "CERVEL Developer Vault", "--authority", "developer-local"]), env);
  console.log(`✓ Created developer Vault ${vaultRoot}`);
}

async function startLocalNode(env: NodeJS.ProcessEnv) {
  const args = ["start", "--vault", vaultRoot, "--port", process.env.CERVEL_DEV_PORT ?? "8787"];
  if (process.env.CERVEL_DEV_DB_PORT) args.push("--db-port", process.env.CERVEL_DEV_DB_PORT);
  run(npmCommand, cervelArgs(args), env);
  console.log("✓ Local Node started and reported ready");
}

async function readBootstrap(): Promise<BootstrapRecord> {
  const path = join(vaultRoot, "runtime", "bootstrap.json");
  if (!(await exists(path))) fail(`Local Node bootstrap record was not written: ${path}`);
  const record = JSON.parse(await readFile(path, "utf8")) as BootstrapRecord;
  if (!record.nodeId || !record.workspaceId || !record.principalId || !record.storageLocationId) {
    fail("Local Node bootstrap record is incomplete.");
  }
  return record;
}

async function verifyReady() {
  try {
    const response = await fetch(`${localUrl}/ready`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) fail(`Local Node readiness check returned HTTP ${response.status}.`);
  } catch (error) {
    fail(`Local Node is not reachable at ${localUrl}: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log(`✓ API ready at ${localUrl}`);
}

async function main() {
  console.log("CERVEL Developer Bootstrap\n");
  assertPrerequisites();
  await ensureEnvFile();
  const passphrase = await developerPassphrase();
  const env = { ...process.env, CERVEL_VAULT_PASSPHRASE: passphrase.value };

  await ensureVault(env);
  await startLocalNode(env);
  await verifyReady();
  const bootstrap = await readBootstrap();

  const state: SetupState = {
    format: "cervel-developer-setup/v0.1",
    vault: vaultRoot,
    url: localUrl,
    node_id: bootstrap.nodeId,
    workspace_id: bootstrap.workspaceId,
    principal_id: bootstrap.principalId,
    storage_location_id: bootstrap.storageLocationId,
    authority: bootstrap.authority,
    passphrase_source: passphrase.source,
    updated_at: new Date().toISOString(),
  };
  await mkdir(stateRoot, { recursive: true, mode: 0o700 });
  await writeFile(setupStatePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });

  console.log("\nCERVEL local environment is ready.\n");
  console.log(`Vault:      ${state.vault}`);
  console.log(`Local Node: ${state.url}`);
  console.log(`Node ID:    ${state.node_id}`);
  console.log(`Workspace:  ${state.workspace_id}`);
  console.log(`Setup state:${setupStatePath}`);
  console.log("\nNext: npm run desktop:dev");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
