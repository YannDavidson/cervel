import { createCipheriv, createDecipheriv, createHash, generateKeyPairSync, randomBytes, scryptSync } from "node:crypto";
import { chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

export const VAULT_FORMAT = "cervel-vault/v0.1";
const MAGIC = Buffer.from("CVLT01");

export type VaultManifest = {
  format: typeof VAULT_FORMAT;
  id: string;
  name: string;
  created_at: string;
  node_authority: string;
  database: { engine: "postgresql+pgvector"; version: 16 };
  encryption: { algorithm: "AES-256-GCM"; kdf: "scrypt"; salt: string };
};

export type VaultSecrets = {
  vault_key: string;
  database_password: string;
  local_api_token: string;
  device_private_key: string;
  device_public_key: string;
};

export function vaultPath(input?: string): string {
  return resolve(input ?? process.env.CERVEL_VAULT ?? join(process.env.HOME ?? process.cwd(), ".cervel", "vaults", "default"));
}

export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  if (passphrase.length < 12) throw new Error("Vault passphrase must contain at least 12 characters");
  return scryptSync(passphrase, salt, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

export function encryptBuffer(plain: Buffer, key: Buffer): Buffer {
  const nonce = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, nonce);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), body]);
}

export function decryptBuffer(payload: Buffer, key: Buffer): Buffer {
  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Invalid CERVEL encrypted payload");
  const nonce = payload.subarray(6, 18), tag = payload.subarray(18, 34), body = payload.subarray(34);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

export async function atomicWrite(path: string, bytes: Buffer | string, mode = 0o600): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temp, bytes, { mode }); await chmod(temp, mode); await rename(temp, path);
}

export async function readManifest(root: string): Promise<VaultManifest> {
  const manifest = JSON.parse(await readFile(join(root, "vault.json"), "utf8")) as VaultManifest;
  if (manifest.format !== VAULT_FORMAT) throw new Error(`Unsupported vault format: ${manifest.format}`);
  return manifest;
}

export async function unlockVault(root: string, passphrase: string): Promise<{manifest: VaultManifest; secrets: VaultSecrets; artifactKey: Buffer}> {
  const manifest = await readManifest(root), wrappingKey = deriveKey(passphrase, Buffer.from(manifest.encryption.salt, "base64"));
  const secrets = JSON.parse(decryptBuffer(await readFile(join(root, "private", "secrets.cvlt")), wrappingKey).toString("utf8")) as VaultSecrets;
  const artifactKey = Buffer.from(secrets.vault_key, "base64");
  if (artifactKey.length !== 32) throw new Error("Invalid vault content key");
  return { manifest, secrets, artifactKey };
}

export async function createVault(root: string, name: string, authority: string, passphrase: string): Promise<VaultManifest> {
  try { await stat(root); throw new Error(`Vault already exists: ${root}`); } catch (error: any) { if (error?.code !== "ENOENT") throw error; }
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(authority)) throw new Error("Node authority must be a lowercase DNS-style slug");
  const salt = randomBytes(16), { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const manifest: VaultManifest = { format:VAULT_FORMAT,id:randomBytes(16).toString("hex"),name,created_at:new Date().toISOString(),node_authority:authority,database:{engine:"postgresql+pgvector",version:16},encryption:{algorithm:"AES-256-GCM",kdf:"scrypt",salt:salt.toString("base64")} };
  const secrets: VaultSecrets = { vault_key:randomBytes(32).toString("base64"),database_password:randomBytes(30).toString("base64url"),local_api_token:randomBytes(32).toString("base64url"),device_private_key:privateKey.export({type:"pkcs8",format:"pem"}).toString(),device_public_key:publicKey.export({type:"spki",format:"pem"}).toString() };
  await mkdir(join(root,"artifacts"),{recursive:true,mode:0o700}); await mkdir(join(root,"database"),{mode:0o700}); await mkdir(join(root,"runtime"),{mode:0o700}); await mkdir(join(root,"backups"),{mode:0o700});
  await atomicWrite(join(root,"vault.json"),JSON.stringify(manifest,null,2)+"\n",0o600);
  await atomicWrite(join(root,"private","secrets.cvlt"),encryptBuffer(Buffer.from(JSON.stringify(secrets)),deriveKey(passphrase,salt)));
  await atomicWrite(join(root,"device-public.pem"),secrets.device_public_key,0o644);
  return manifest;
}

export function safeVaultFile(root: string, relative: string): string {
  const base=resolve(root), target=resolve(base,relative);
  if(target!==base&&!target.startsWith(base+sep))throw new Error("Vault path traversal rejected");
  return target;
}

export function sha256(bytes: Buffer): string { return createHash("sha256").update(bytes).digest("hex"); }
