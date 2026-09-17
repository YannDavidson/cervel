import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("Desktop product convergence",()=>{
  const root=process.cwd();
  test("cervel dev launches the canonical Tauri experience",async()=>{
    const pkg=JSON.parse(await readFile(join(root,"package.json"),"utf8"));
    const launcher=await readFile(join(root,"scripts","developer-dev.ts"),"utf8");
    const doctor=await readFile(join(root,"scripts","developer-doctor.ts"),"utf8");
    expect(pkg.scripts["desktop:dev"]).toBe("npm run desktop:canonical:dev");
    expect(pkg.scripts["desktop:canonical:dev"]).toContain("apps/desktop-tauri/src-tauri/Cargo.toml");
    expect(pkg.scripts["desktop:legacy:dev"]).toContain("electron .");
    expect(launcher).toContain('["run", "desktop:canonical:dev"]');
    expect(launcher).not.toContain('["run", "desktop:legacy:dev"]');
    expect(doctor).toContain('command("cargo", ["--version"])');
    expect(doctor).toContain('add("Canonical Desktop toolchain", "fail"');
    expect(doctor).not.toContain('Electron dependency installed');
  });

  test("deliverables and connections stay behind the native Local Node bridge",async()=>{
    const rust=await readFile(join(root,"apps/desktop-tauri/src-tauri/src/lib.rs"),"utf8");
    const routes=await readFile(join(root,"apps/api/src/local-node-routes.ts"),"utf8");
    const html=await readFile(join(root,"apps/desktop-tauri/ui/index.html"),"utf8");
    expect(rust).toContain('fn deliverables(');
    expect(rust).toContain('fn connections(');
    expect(rust).toContain('/v1/local/deliverables?node_id=');
    expect(rust).toContain('/v1/local/connections?node_id=');
    expect(routes).toContain('app.get("/v1/local/deliverables"');
    expect(routes).toContain('app.get("/v1/local/connections"');
    expect(routes).toContain('canonical-deliverable-manifests');
    expect(routes).toContain('external-gateway-runtime');
    expect(html).toContain('data-view="deliverables"');
    expect(html).toContain('AGENT GATEWAY · MCP · CAPTURE');
    expect(html).not.toContain('x-cervel-local-token');
  });

  test("connections projection never exposes token hashes",async()=>{
    const routes=await readFile(join(root,"apps/api/src/local-node-routes.ts"),"utf8");
    const segment=routes.slice(routes.indexOf('app.get("/v1/local/connections"'));
    expect(segment).not.toContain("token_hash");
    expect(segment).not.toContain("device_code_hash");
    expect(segment).not.toContain("user_code_hash");
    expect(segment).toContain("active_grants");
    expect(segment).toContain("receipt_count");
  });
});
