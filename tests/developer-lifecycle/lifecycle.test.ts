import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("deterministic developer lifecycle", () => {
  const root = process.cwd();

  test("package exposes stop and destructive reset commands", async () => {
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    expect(pkg.scripts["cervel:stop"]).toBe("tsx scripts/developer-lifecycle.ts stop");
    expect(pkg.scripts["cervel:reset"]).toBe("tsx scripts/developer-lifecycle.ts reset");
  });

  test("reset requires an explicit destructive confirmation", async () => {
    const source = await readFile(join(root, "scripts", "developer-lifecycle.ts"), "utf8");
    expect(source).toContain('process.argv.includes("--yes")');
    expect(source).toContain('CERVEL_RESET_CONFIRM === "DELETE-DEVELOPER-STATE"');
    expect(source).toContain("No data was removed.");
    expect(source.indexOf("if (!resetConfirmed())")).toBeLessThan(source.indexOf("await stop();"));
  });

  test("reset stops before removing only configured developer state", async () => {
    const source = await readFile(join(root, "scripts", "developer-lifecycle.ts"), "utf8");
    const stop = source.indexOf("await stop();");
    const vaultRemoval = source.indexOf("await rm(vaultRoot", stop);
    const stateRemoval = source.indexOf("await rm(stateRoot", vaultRemoval);
    expect(stop).toBeGreaterThan(-1);
    expect(vaultRemoval).toBeGreaterThan(stop);
    expect(stateRemoval).toBeGreaterThan(vaultRemoval);
  });
});
