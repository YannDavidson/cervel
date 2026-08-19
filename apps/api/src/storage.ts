import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? "us-east-1";
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const managedBucket = process.env.CERVEL_STORAGE_MANAGED === "true";

if (!endpoint || !accessKeyId || !secretAccessKey) {
  throw new Error("S3_ENDPOINT, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required");
}

export const bucket = process.env.S3_BUCKET ?? "cervel";

export const s3 = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey }
});

export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (managedBucket) throw Object.assign(new Error("MANAGED_STORAGE_BUCKET_UNAVAILABLE"),{cause:error});
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export async function putArtifact(objectKey: string, body: Buffer, contentType: string): Promise<void> {
  await ensureBucket();
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: body,
    ContentType: contentType
  }));
}
