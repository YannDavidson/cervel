import { spawnSync } from "node:child_process";
import { readFile, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, parse, relative, resolve } from "node:path";

const action = process.argv[2];
const repoRoot = resolve(process.cwd());
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const cervelHome = resolve(join(homedir(), ".cervel"));
const vaultRoot = resolve(process.env.CERVEL_DEV_VAULT ?? join(cervelHome, "vaults", "developer"));
const stateRoot = resolve(process.env.CERVEL_DEV_STATE_DIR ?? join(cervelHome, "developer"));
const passphrasePath = join(stateRoot, "bootstrap-passphrase");
const setupStatePath = join(stateRoot, "setup.json");
const localUrl = `http://127.0.0.1:${process.env.CERVEL_DEV_PORT ?? "8787"}`;

const exists = async (path: string) => stat(path).then(() => true).catch(() => false);

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
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
  return result;
}

function isInside(parent: string, candidate: string): boolean {
  const rel = relative(parent, candidate);
  return rel !== "" && !rel.startsWith("..") && !resolve(parent, rel).startsWith(`${parse(parent).root}..`);
}

function assertSafeResetPath(label: string, candidate: string) {
  const root = parse(candidate).root;
  const home = resolve(homedir());
  const forbidden = new Set([root, home, repoRoot, dirname(repoRoot)]);
  if (forbidden.has(candidate)) fail(`Refusing reset: ${label} resolves to protected path ${candidate}.`);
  if (!isInside(cervelHome, candidate)) {
    fail(`Refusing reset: ${label} must be a child of the CERVEL developer root ${cervelHome}; got ${candidate}.`);
  }
}

function assertSafeResetRoots() {
  assertSafeResetPath("CERVEL_DEV_VAULT", vaultRoot);
  assertSafeResetPath("CERVEL_DEV_STATE_DIR", stateRoot);
  if (vaultRoot === stateRoot || isInside(vaultRoot, stateRoot) || isInside(stateRoot, vaultRoot)) {
    fail("Refusing reset: developer Vault and orchestration state roots must be distinct, non-nested paths.");
  }
}

async function developerPassphrase(): Promise<string | undefined> {
  const supplied = process.env.CERVEL_VAULT_PASSPHRASE?.trim();
  if (supplied) return supplied;
  if (await exists(passphrasePath)) return (await readFile(passphrasePath, "utf8")).trim();
  return undefined;
}

async function stop() {
  console.log("CERVEL Developer Stop\n");
  if (!(await exists(join(vaultRoot, "vault.json")))) {
    console.log("✓ No developer Vault exists; runtime is already stopped");
    return;
  }

  const passphrase = await developerPassphrase();
  if (!passphrase) fail(`Cannot unlock the developer Vault to stop it. Set CERVEL_VAULT_PASSPHRASE or restore ${passphrasePath}.`);
  const result = run(npmCommand, ["run", "--silent", "cervel", "--", "lock", "--vault", vaultRoot], {
    ...process.env,
    CERVEL_VAULT_PASSPHRASE: passphrase,
  });
  if (result.status !== 0) fail(`Failed to stop the developer Vault (exit ${result.status}).`);

  try {
    const response = await fetch(`${localUrl}/ready`, { signal: AbortSignal.timeout(750) });
    if (response.ok) fail(`Local Node still reports ready at ${localUrl} after stop.`);
  } catch {
    // Expected: a stopped Local Node is unreachable.
  }
  console.log("✓ Developer Local Node and Vault-scoped database are stopped");
}

function resetConfirmed(): boolean {
  return process.argv.includes("--yes") || process.env.CERVEL_RESET_CONFIRM === "DELETE-DEVELOPER-STATE";
}

async function reset() {
  console.log("CERVEL Developer Reset\n");
  assertSafeResetRoots();
  if (!resetConfirmed()) {
    console.error("Reset is destructive: it removes the configured developer Vault, captured local knowledge in that Vault, and developer orchestration state.");
    console.error("No data was removed.");
    console.error("\nTo confirm intentionally, rerun:\n  npm run cervel:reset -- --yes");
    console.error("\nCI may set CERVEL_RESET_CONFIRM=DELETE-DEVELOPER-STATE instead of using an interactive prompt.");
    process.exit(2);
  }

  await stop();
  await rm(vaultRoot, { recursive: true, force: true });
  await rm(stateRoot, { recursive: true, force: true });

  if (await exists(vaultRoot)) fail(`Developer Vault still exists after reset: ${vaultRoot}`);
  if (await exists(setupStatePath) || await exists(passphrasePath)) fail(`Developer orchestration state still exists after reset: ${stateRoot}`);

  console.log(`✓ Removed developer Vault: ${vaultRoot}`);
  console.log(`✓ Removed developer orchestration state: ${stateRoot}`);
  console.log("✓ CERVEL developer state is back to zero");
  console.log("\nNext: npm run cervel:setup");
}

async function main() {
  if (action === "stop") return stop();
  if (action === "reset") return reset();
  fail("Usage: developer-lifecycle <stop|reset> [--yes]");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
