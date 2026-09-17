import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const ALPHA4_REQUIRED_CHECKS = [
  "clean_mac_install",
  "canonical_tauri",
  "local_lifecycle",
  "restart_persistence",
  "real_capture",
  "corpus_switching",
  "ask_citations_trace",
  "security_boundaries",
  "responsive_ui",
  "deployment_modes",
  "everywhere_continuity",
] as const;

export type Alpha4Check = typeof ALPHA4_REQUIRED_CHECKS[number];

type Evidence = {
  status: "passed";
  detail: string;
  source?: string;
  recorded_at: string;
};

type Report = {
  protocol: "cervel-alpha4-acceptance/v0.1";
  release: "Alpha.4";
  commit_sha: string;
  run_id: string;
  generated_at: string;
  result: "passed";
  checks: Record<Alpha4Check, Evidence>;
  release_readiness: {
    automated_ci: "passed";
    signed_release_artifacts: "pending";
    physical_device_qualification: "pending";
  };
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function record() {
  const check = arg("--check") as Alpha4Check | undefined;
  const detail = arg("--detail");
  const source = arg("--source");
  const out = resolve(arg("--out") ?? "reports/alpha4/fragment.json");
  if (!check || !ALPHA4_REQUIRED_CHECKS.includes(check)) throw new Error(`Unknown Alpha.4 check: ${check ?? "<missing>"}`);
  if (!detail) throw new Error("--detail is required");
  await writeJson(out, { check, evidence: { status: "passed", detail, source, recorded_at: new Date().toISOString() } });
  console.log(`Alpha.4 evidence recorded: ${check}`);
}

async function collect(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(path);
  }
  return files;
}

async function finalize() {
  const fragmentsDir = resolve(arg("--fragments") ?? "reports/alpha4/fragments");
  const out = resolve(arg("--out") ?? "reports/alpha4/acceptance.json");
  const checks = {} as Record<Alpha4Check, Evidence>;
  for (const path of await collect(fragmentsDir)) {
    const parsed = JSON.parse(await readFile(path, "utf8")) as { check?: Alpha4Check; evidence?: Evidence };
    if (parsed.check && ALPHA4_REQUIRED_CHECKS.includes(parsed.check) && parsed.evidence?.status === "passed") checks[parsed.check] = parsed.evidence;
  }
  const missing = ALPHA4_REQUIRED_CHECKS.filter(check => !checks[check]);
  if (missing.length) throw new Error(`Alpha.4 acceptance evidence missing: ${missing.join(", ")}`);
  const report: Report = {
    protocol: "cervel-alpha4-acceptance/v0.1",
    release: "Alpha.4",
    commit_sha: process.env.CERVEL_ACCEPTANCE_SHA ?? process.env.GITHUB_SHA ?? "unknown",
    run_id: process.env.GITHUB_RUN_ID ?? "local",
    generated_at: new Date().toISOString(),
    result: "passed",
    checks,
    release_readiness: {
      automated_ci: "passed",
      signed_release_artifacts: "pending",
      physical_device_qualification: "pending",
    },
  };
  await writeJson(out, report);
  console.log(`CERVEL Alpha.4 acceptance PASS: ${out}`);
}

const command = process.argv[2];
if (command === "record") record().catch(error => { console.error(error); process.exit(1); });
else if (command === "finalize") finalize().catch(error => { console.error(error); process.exit(1); });
else {
  console.error("Usage: alpha4-acceptance.ts record|finalize ...");
  process.exit(2);
}
