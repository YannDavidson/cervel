import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source = resolve("packages/shared-experience/assets/brand/cervel-logo.png");
const target = resolve("apps/desktop-tauri/ui/brand/cervel-logo.png");

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log(`Prepared canonical CERVEL brand asset: ${target}`);
