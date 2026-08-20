import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVault, decryptBuffer, encryptBuffer, safeVaultFile, unlockVault } from "../../apps/local-node/src/vault";

describe("CERVEL Vault",()=>{
  let root:string;beforeEach(async()=>{root=await mkdtemp(join(tmpdir(),"cervel-vault-"));await rm(root,{recursive:true});});afterEach(()=>rm(root,{recursive:true,force:true}));
  test("creates and unlocks an encrypted device identity",async()=>{const manifest=await createVault(root,"Test Vault","test-node","correct horse battery staple");const unlocked=await unlockVault(root,"correct horse battery staple");expect(unlocked.manifest.id).toBe(manifest.id);expect(unlocked.secrets.device_private_key).toContain("PRIVATE KEY");expect((await readFile(join(root,"private","secrets.cvlt"))).toString()).not.toContain("PRIVATE KEY");});
  test("rejects a wrong passphrase",async()=>{await createVault(root,"Test Vault","test-node","correct horse battery staple");await expect(unlockVault(root,"this passphrase is wrong")).rejects.toThrow();});
  test("authenticates encrypted content and rejects traversal",()=>{const key=Buffer.alloc(32,7),plain=Buffer.from("sovereign knowledge");expect(decryptBuffer(encryptBuffer(plain,key),key)).toEqual(plain);const tampered=encryptBuffer(plain,key);tampered[tampered.length-1]^=1;expect(()=>decryptBuffer(tampered,key)).toThrow();expect(()=>safeVaultFile(root,"../escape")).toThrow("traversal");});
});
