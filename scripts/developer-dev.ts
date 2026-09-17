import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const stateRoot = resolve(process.env.CERVEL_DEV_STATE_DIR ?? join(homedir(), ".cervel", "developer"));
const setupPath = join(stateRoot, "setup.json");
const passphrasePath = join(stateRoot, "bootstrap-passphrase");
const localUrl = `http://127.0.0.1:${process.env.CERVEL_DEV_PORT ?? "8787"}`;
const children = new Set<ChildProcess>();
let shuttingDown = false;

const exists = async (path: string) => stat(path).then(() => true).catch(() => false);

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function runSync(script: string, args: string[] = [], env: NodeJS.ProcessEnv = process.env) {
  const result = spawnSync(npmCommand, ["run", script, ...(args.length ? ["--", ...args] : [])], {
    cwd: repoRoot,
    env,
    stdio: "inherit",
  });
  if (result.error) fail(`${script} could not be executed: ${result.error.message}`);
  return result.status ?? 1;
}

async function ready() {
  try {
    const response = await fetch(`${localUrl}/ready`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function runtimeEnv(): Promise<NodeJS.ProcessEnv> {
  const supplied = process.env.CERVEL_VAULT_PASSPHRASE?.trim();
  if (supplied) return process.env;
  if (await exists(passphrasePath)) {
    return { ...process.env, CERVEL_VAULT_PASSPHRASE: (await readFile(passphrasePath, "utf8")).trim() };
  }
  return process.env;
}

async function ensureRuntime() {
  console.log("1/5  Checking developer environment...");
  const doctor = runSync("cervel:doctor", ["--json"]);
  if (doctor === 0 && await ready()) {
    console.log("✓ Existing encrypted Local Node is healthy; reusing it.");
    return;
  }

  console.log("\n2/5  Bootstrapping encrypted local runtime...");
  const setup = runSync("cervel:setup");
  if (setup !== 0) fail("Developer bootstrap failed. Resolve the reported prerequisite and rerun npm run cervel:dev.");

  console.log("\n3/5  Local infrastructure and encrypted Local Node started.");
  if (!(await exists(setupPath))) fail(`Developer setup state was not created at ${setupPath}.`);

  console.log("\n4/5  Waiting for Local Node readiness...");
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await ready()) {
      console.log(`✓ Local Node ready at ${localUrl}`);
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  fail(`Local Node did not become ready at ${localUrl} within 30 seconds.`);
}

function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nStopping CERVEL development launcher (${signal})...`);
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
  setTimeout(() => process.exit(0), 500).unref();
}

async function main() {
  console.log("CERVEL Canonical Local Product Runtime\n");
  await ensureRuntime();
  const env = await runtimeEnv();

  console.log("\n5/5  Starting canonical CERVEL Desktop (Tauri)...");
  console.log("The legacy Electron presentation is deprecated and is no longer launched by cervel:dev.");
  console.log("\nCERVEL is ready. Press Ctrl+C to stop the development launcher.\n");

  const desktop = spawn(npmCommand, ["run", "desktop:canonical:dev"], {
    cwd: repoRoot,
    env: { ...env, CERVEL_CANONICAL_EXPERIENCE: "1" },
    stdio: "inherit",
  });
  children.add(desktop);

  desktop.once("error", (error) => fail(`Canonical Desktop could not be started: ${error.message}`));
  desktop.once("exit", (code, signal) => {
    children.delete(desktop);
    if (shuttingDown) return;
    if (signal) process.exit(0);
    process.exit(code ?? 0);
  });

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
