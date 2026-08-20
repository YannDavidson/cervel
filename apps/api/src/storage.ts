import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { appendFile, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? "us-east-1";
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const managedBucket = process.env.CERVEL_STORAGE_MANAGED === "true";

const vaultDriver=process.env.CERVEL_STORAGE_DRIVER==="vault";
if (!vaultDriver&&(!endpoint || !accessKeyId || !secretAccessKey)) {
  throw new Error("S3_ENDPOINT, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required");
}

export const bucket = process.env.S3_BUCKET ?? "cervel";

export const s3 = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: accessKeyId&&secretAccessKey?{ accessKeyId, secretAccessKey }:undefined
});

export async function ensureBucket(): Promise<void> {
  if(vaultDriver)return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (managedBucket) throw Object.assign(new Error("MANAGED_STORAGE_BUCKET_UNAVAILABLE"),{cause:error});
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export async function putArtifact(objectKey: string, body: Buffer, contentType: string): Promise<void> {
  if(vaultDriver){
    const root=process.env.CERVEL_VAULT_PATH,key=Buffer.from(process.env.CERVEL_VAULT_KEY??"","base64");
    if(!root||key.length!==32)throw new Error("CERVEL_VAULT_PATH and a 32-byte CERVEL_VAULT_KEY are required for vault storage");
    const base=resolve(root,"artifacts"),target=resolve(base,`${objectKey}.cvlt`);if(!target.startsWith(base+sep))throw new Error("ARTIFACT_PATH_TRAVERSAL");
    const nonce=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,nonce),ciphertext=Buffer.concat([cipher.update(body),cipher.final()]),encrypted=Buffer.concat([Buffer.from("CVLT01"),nonce,cipher.getAuthTag(),ciphertext]);
    await mkdir(dirname(target),{recursive:true,mode:0o700});const temp=`${target}.${process.pid}.tmp`;await writeFile(temp,encrypted,{mode:0o600});await rename(temp,target);
    await appendFile(resolve(base,"index.jsonl"),JSON.stringify({path:`${objectKey}.cvlt`,sha256:createHash("sha256").update(body).digest("hex"),size:body.length,content_type:contentType})+"\n",{mode:0o600});return;
  }
  await ensureBucket();
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: body,
    ContentType: contentType
  }));
}
