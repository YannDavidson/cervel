import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("one-command developer runtime", () => {
  const root = process.cwd();

  test("package exposes cervel:dev as the canonical launcher", async () => {
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    expect(pkg.scripts["cervel:dev"]).toBe("tsx scripts/developer-dev.ts");
  });

  test("launcher preserves doctor -> bootstrap -> readiness -> desktop ordering", async () => {
    const source = await readFile(join(root, "scripts", "developer-dev.ts"), "utf8");
    const doctor = source.indexOf('runSync("cervel:doctor"');
    const setup = source.indexOf('runSync("cervel:setup"');
    const readiness = source.indexOf("await ready()", setup);
    const desktop = source.indexOf('["run", "desktop:dev"]');

    expect(doctor).toBeGreaterThan(-1);
    expect(setup).toBeGreaterThan(doctor);
    expect(readiness).toBeGreaterThan(setup);
    expect(desktop).toBeGreaterThan(readiness);
  });

  test("README headlines the four-line GitHub-to-CERVEL flow", async () => {
    const readme = await readFile(join(root, "README.md"), "utf8");
    expect(readme).toContain("git clone https://github.com/YannDavidson/cervel.git\ncd cervel\nnpm ci\nnpm run cervel:dev");
    expect(readme).toContain("`npm run cervel:dev` is the canonical development launcher");
  });
});
