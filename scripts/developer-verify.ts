import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { unlockVault } from "../apps/local-node/src/vault";

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

type GoldenReport = {
  checks?: Record<string, { status?: string }>;
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const repoRoot = process.cwd();
const stateRoot = resolve(process.env.CERVEL_DEV_STATE_DIR ?? join(homedir(), ".cervel", "developer"));
const setupStatePath = join(stateRoot, "setup.json");
const passphrasePath = join(stateRoot, "bootstrap-passphrase");
const reportPath = resolve(process.env.CERVEL_VERIFY_REPORT ?? "reports/golden-path/developer-verify.json");

const requiredChecks = [
  "vault_created",
  "node_ready",
  "desktop_boundary",
  "browser_capture",
  "duplicate_detection",
  "prompt_injection_quarantined",
  "mobile_capture",
  "retrieval",
  "cited_answer",
  "intelligence_routing",
  "trace_complete",
  "state_digest",
  "sync_convergence",
  "revocation",
];

const exists = async (path: string) => stat(path).then(() => true).catch(() => false);

function fail(message: string, fix?: string): never {
  console.error(`\n✗ ${message}`);
  if (fix) console.error(`\nFix:\n${fix}`);
  process.exit(1);
}

function run(args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(npmCommand, args, {
    cwd: repoRoot,
    env,
    stdio: "inherit",
    encoding: "utf8",
  });
  if (result.error) fail(`npm could not be executed: ${result.error.message}`);
  if (result.status !== 0) fail(`Verification stage failed with exit code ${result.status}.`, "Run npm run cervel:doctor, fix any reported issue, then rerun npm run cervel:verify.");
}

async function readSetupState(): Promise<SetupState> {
  if (!(await exists(setupStatePath))) {
    fail(`Developer setup state is missing: ${setupStatePath}`, "Run npm run cervel:setup first, then rerun npm run cervel:verify.");
  }
  let state: SetupState;
  try {
    state = JSON.parse(await readFile(setupStatePath, "utf8")) as SetupState;
  } catch {
    fail(`Developer setup state is not valid JSON: ${setupStatePath}`, "Run npm run cervel:doctor for diagnostics, then rerun npm run cervel:setup if needed.");
  }
  const required = [state.vault, state.url, state.node_id, state.workspace_id, state.principal_id, state.storage_location_id];
  if (state.format !== "cervel-developer-setup/v0.1" || required.some(value => !value)) {
    fail("Developer setup state is incomplete or unsupported.", "Run npm run cervel:setup to refresh developer state.");
  }
  return state;
}

async function resolvePassphrase(state: SetupState): Promise<string> {
  const supplied = process.env.CERVEL_VAULT_PASSPHRASE?.trim();
  if (supplied) return supplied;
  if (state.passphrase_source === "generated-local-file" && await exists(passphrasePath)) {
    const value = (await readFile(passphrasePath, "utf8")).trim();
    if (value) return value;
  }
  fail(
    "The developer Vault passphrase is not available to verification.",
    state.passphrase_source === "environment"
      ? "Set CERVEL_VAULT_PASSPHRASE to the same value used during npm run cervel:setup, then rerun npm run cervel:verify."
      : "Run npm run cervel:doctor, then rerun npm run cervel:setup if the generated developer passphrase state is missing.",
  );
}

async function ready(url: string) {
  try {
    const response = await fetch(new URL("/ready", url), { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureLocalNode(state: SetupState, passphrase: string) {
  if (await ready(state.url)) return;
  const parsed = new URL(state.url);
  const port = parsed.port || "8787";
  const args = ["run", "--silent", "cervel", "--", "start", "--vault", state.vault, "--port", port];
  if (process.env.CERVEL_DEV_DB_PORT) args.push("--db-port", process.env.CERVEL_DEV_DB_PORT);
  run(args, { ...process.env, CERVEL_VAULT_PASSPHRASE: passphrase });
  if (!(await ready(state.url))) {
    fail(`Local Node is not ready at ${state.url}.`, "Run npm run cervel:doctor and resolve the reported runtime issue.");
  }
}

async function verifyReport() {
  const report = JSON.parse(await readFile(reportPath, "utf8")) as GoldenReport;
  const missing = requiredChecks.filter(name => report.checks?.[name]?.status !== "passed");
  if (missing.length) fail(`Alpha verification report is missing required passing checks: ${missing.join(", ")}`);
  return Object.keys(report.checks ?? {}).length;
}

async function main() {
  console.log("CERVEL Self-Contained Alpha Verification\n");
  const state = await readSetupState();
  const passphrase = await resolvePassphrase(state);
  const unlocked = await unlockVault(state.vault, passphrase).catch(error => fail(
    `Developer Vault could not be unlocked: ${error instanceof Error ? error.message : String(error)}`,
    "Confirm the Vault passphrase and run npm run cervel:doctor for diagnostics.",
  ));

  await ensureLocalNode(state, passphrase);

  const verificationEnv: NodeJS.ProcessEnv = {
    ...process.env,
    CERVEL_LOCAL_API_TOKEN: unlocked.secrets.local_api_token,
    CERVEL_GOLDEN_URL: state.url,
    CERVEL_GOLDEN_NODE_ID: state.node_id,
    CERVEL_GOLDEN_WORKSPACE_ID: state.workspace_id,
    CERVEL_GOLDEN_PRINCIPAL_ID: state.principal_id,
    CERVEL_GOLDEN_STORAGE_ID: state.storage_location_id,
    CERVEL_GOLDEN_REPORT: reportPath,
  };

  console.log(`✓ Setup state loaded from ${setupStatePath}`);
  console.log(`✓ Developer Vault unlocked in memory: ${state.vault}`);
  console.log(`✓ Local Node ready at ${state.url}`);
  console.log("✓ Golden-path identity resolved automatically");
  console.log("\nRunning alpha golden-path verification...\n");

  run(["run", "--silent", "alpha:golden-path", "--", "run"], verificationEnv);
  const checks = await verifyReport();

  console.log("\nCERVEL alpha verification PASS\n");
  console.log(`Checks: ${checks}`);
  console.log(`Report: ${reportPath}`);
  console.log("No manual CERVEL_GOLDEN_* identifiers or Local Node API token were required.");
}

main().catch(error => fail(error instanceof Error ? error.message : String(error)));
