import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { Socket } from "node:net";

type Level = "pass" | "warn" | "fail";
type Check = { name: string; level: Level; detail: string; fix?: string };
type SetupState = {
  format?: string;
  vault?: string;
  url?: string;
  node_id?: string;
  workspace_id?: string;
  principal_id?: string;
  storage_location_id?: string;
  authority?: string;
  passphrase_source?: string;
};
type BootstrapRecord = {
  nodeId?: string;
  workspaceId?: string;
  principalId?: string;
  storageLocationId?: string;
  authority?: string;
};
type VaultManifest = { id?: string; node_authority?: string; database?: { engine?: string; version?: number } };

const repoRoot = process.cwd();
const stateRoot = resolve(process.env.CERVEL_DEV_STATE_DIR ?? join(homedir(), ".cervel", "developer"));
const defaultVault = resolve(process.env.CERVEL_DEV_VAULT ?? join(homedir(), ".cervel", "vaults", "developer"));
const setupPath = join(stateRoot, "setup.json");
const passphrasePath = join(stateRoot, "bootstrap-passphrase");
const devPort = Number(process.env.CERVEL_DEV_PORT ?? 8787);
const dbPort = Number(process.env.CERVEL_DEV_DB_PORT ?? 55432);
const jsonMode = process.argv.includes("--json");
const checks: Check[] = [];

const exists = async (path: string) => stat(path).then(() => true).catch(() => false);
const add = (name: string, level: Level, detail: string, fix?: string) => checks.push({ name, level, detail, fix });

function command(command: string, args: string[] = []) {
  return spawnSync(command, args, { cwd: repoRoot, encoding: "utf8" });
}

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const socket = new Socket();
    const done = (open: boolean) => { socket.destroy(); resolvePort(open); };
    socket.setTimeout(750);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, "127.0.0.1");
  });
}

async function readJson<T>(path: string): Promise<T | null> {
  try { return JSON.parse(await readFile(path, "utf8")) as T; }
  catch { return null; }
}

async function checkToolchain() {
  const major = Number(process.versions.node.split(".")[0]);
  if (Number.isFinite(major) && major >= 20) add("Node.js", "pass", process.versions.node);
  else add("Node.js", "fail", process.versions.node, "Install Node.js 20 or newer.");

  const npm = command(process.platform === "win32" ? "npm.cmd" : "npm", ["--version"]);
  if (!npm.error && npm.status === 0) add("npm", "pass", String(npm.stdout).trim());
  else add("npm", "fail", "npm is unavailable", "Install npm with a supported Node.js release.");

  const docker = command("docker", ["version", "--format", "{{.Server.Version}}"]);
  if (!docker.error && docker.status === 0) add("Docker daemon", "pass", String(docker.stdout).trim());
  else add("Docker daemon", "fail", "Docker is unavailable or not running", "Install/start Docker Desktop or a compatible Docker daemon.");

  if (await exists(join(repoRoot, "package.json"))) add("Repository", "pass", repoRoot);
  else add("Repository", "fail", "package.json not found", "Run the doctor from the CERVEL repository root.");

  if (await exists(join(repoRoot, ".env.example"))) add("Environment template", "pass", ".env.example present");
  else add("Environment template", "fail", ".env.example missing", "Restore .env.example from the repository.");

  if (await exists(join(repoRoot, ".env"))) add("Environment file", "pass", ".env present");
  else add("Environment file", "warn", ".env not created yet", "Run npm run cervel:setup; setup creates it from .env.example.");

  const cargo = command("cargo", ["--version"]);
  if (!cargo.error && cargo.status === 0) add("Canonical Desktop toolchain", "pass", String(cargo.stdout).trim());
  else add("Canonical Desktop toolchain", "fail", "Rust/Cargo is unavailable", "Install the Rust toolchain required by the canonical Tauri Desktop before running npm run cervel:dev.");

  const manifest = join(repoRoot, "apps", "desktop-tauri", "src-tauri", "Cargo.toml");
  if (await exists(manifest)) add("Canonical Desktop manifest", "pass", manifest);
  else add("Canonical Desktop manifest", "fail", "Tauri Cargo.toml is missing", "Restore apps/desktop-tauri/src-tauri/Cargo.toml from the repository.");
}

async function checkRuntime() {
  if (!(await exists(setupPath))) {
    add("Developer setup", "fail", `No setup state at ${setupPath}`, "Run npm run cervel:setup.");
    const apiOpen = await portOpen(devPort);
    add("API port", apiOpen ? "warn" : "pass", apiOpen ? `127.0.0.1:${devPort} is occupied without CERVEL setup state` : `127.0.0.1:${devPort} available`);
    return;
  }

  const setup = await readJson<SetupState>(setupPath);
  if (!setup || setup.format !== "cervel-developer-setup/v0.1") {
    add("Developer setup", "fail", `Malformed or unsupported setup state: ${setupPath}`, "Move the invalid setup.json aside and rerun npm run cervel:setup.");
    return;
  }
  const required = [setup.vault, setup.url, setup.node_id, setup.workspace_id, setup.principal_id, setup.storage_location_id, setup.authority];
  if (required.some((value) => !value)) add("Developer setup", "fail", "setup.json is incomplete", "Rerun npm run cervel:setup.");
  else add("Developer setup", "pass", setupPath);

  const vault = resolve(setup.vault ?? defaultVault);
  const manifestPath = join(vault, "vault.json");
  const bootstrapPath = join(vault, "runtime", "bootstrap.json");

  const manifest = await readJson<VaultManifest>(manifestPath);
  if (!manifest?.id || !manifest.node_authority) {
    add("Vault manifest", "fail", `Missing or invalid ${manifestPath}`, "Restore the Vault or reset the developer Vault and rerun setup.");
  } else {
    const db = manifest.database;
    const dbLabel = db?.engine && db?.version ? `${db.engine} ${db.version}` : "database metadata unavailable";
    add("Vault manifest", "pass", `${vault} (${dbLabel})`);
    if (setup.authority !== manifest.node_authority) add("Authority consistency", "fail", "setup authority does not match Vault authority", "Rerun npm run cervel:setup after resolving the stale developer state.");
    else add("Authority consistency", "pass", setup.authority ?? "");
  }

  if (setup.passphrase_source === "generated-local-file") {
    if (await exists(passphrasePath)) add("Developer passphrase state", "pass", `${passphrasePath} present outside the repository`);
    else add("Developer passphrase state", "fail", `Expected generated passphrase file is missing: ${passphrasePath}`, "Restore the file or recreate the developer Vault with npm run cervel:setup.");
  } else if (setup.passphrase_source === "environment") {
    add("Developer passphrase state", "pass", "Vault passphrase is externally supplied; no local passphrase file required");
  } else {
    add("Developer passphrase state", "warn", "Unknown passphrase source in setup.json");
  }

  const bootstrap = await readJson<BootstrapRecord>(bootstrapPath);
  if (!bootstrap) {
    add("Database bootstrap record", "fail", `Missing or invalid ${bootstrapPath}`, "Rerun npm run cervel:setup.");
  } else {
    const stable = setup.node_id === bootstrap.nodeId && setup.workspace_id === bootstrap.workspaceId && setup.principal_id === bootstrap.principalId && setup.storage_location_id === bootstrap.storageLocationId;
    if (stable) add("Bootstrap identity", "pass", "node/workspace/principal/storage IDs agree with runtime bootstrap state");
    else add("Bootstrap identity", "fail", "setup.json disagrees with runtime/bootstrap.json", "Rerun npm run cervel:setup; if mismatch persists, reset the developer environment.");
  }

  if (manifest?.id) {
    const container = `cervel-vault-${manifest.id.slice(0, 12)}`;
    const inspect = command("docker", ["container", "inspect", "-f", "{{.State.Running}}", container]);
    if (!inspect.error && inspect.status === 0 && String(inspect.stdout).trim() === "true") {
      add("PostgreSQL container", "pass", `${container} running`);
      const pg = command("docker", ["exec", container, "pg_isready", "-U", "cervel"]);
      if (pg.status === 0) add("PostgreSQL readiness", "pass", "pg_isready succeeded");
      else add("PostgreSQL readiness", "fail", "container is running but PostgreSQL is not ready", "Inspect Docker logs and rerun npm run cervel:setup.");
    } else {
      add("PostgreSQL container", "fail", `${container} is not running`, "Run npm run cervel:setup.");
    }
  }

  const dbOpen = await portOpen(dbPort);
  add("Database port", dbOpen ? "pass" : "fail", dbOpen ? `127.0.0.1:${dbPort} accepting connections` : `127.0.0.1:${dbPort} is not accepting connections`, dbOpen ? undefined : "Run npm run cervel:setup or check CERVEL_DEV_DB_PORT.");

  const url = setup.url ?? `http://127.0.0.1:${devPort}`;
  try {
    const response = await fetch(`${url}/ready`, { signal: AbortSignal.timeout(2000) });
    if (response.ok) add("Local Node API", "pass", `${url}/ready returned HTTP ${response.status}`);
    else add("Local Node API", "fail", `${url}/ready returned HTTP ${response.status}`, "Rerun npm run cervel:setup and inspect the Vault runtime/node.log if needed.");
  } catch (error) {
    add("Local Node API", "fail", `${url}/ready unreachable: ${error instanceof Error ? error.message : String(error)}`, "Run npm run cervel:setup; if it still fails, inspect the Vault runtime/node.log.");
  }
}

function report() {
  const failures = checks.filter((check) => check.level === "fail").length;
  const warnings = checks.filter((check) => check.level === "warn").length;
  if (jsonMode) {
    console.log(JSON.stringify({ ok: failures === 0, failures, warnings, checks }, null, 2));
  } else {
    console.log("CERVEL Developer Doctor\n");
    for (const check of checks) {
      const mark = check.level === "pass" ? "✓" : check.level === "warn" ? "!" : "✗";
      console.log(`${mark} ${check.name}: ${check.detail}`);
      if (check.fix) console.log(`  Fix: ${check.fix}`);
    }
    console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${failures} blocking issue(s), ${warnings} warning(s)`);
  }
  process.exitCode = failures === 0 ? 0 : 1;
}

async function main() {
  await checkToolchain();
  await checkRuntime();
  report();
}

main().catch((error) => {
  add("Doctor", "fail", error instanceof Error ? error.message : String(error));
  report();
});
