import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function getR2Client(env: any) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function getPresignedUploadUrl(
  env: any,
  key: string,
  contentType: string,
  expiresIn = 300
) {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getR2Client(env), command, { expiresIn });
}

export async function getPresignedDownloadUrl(
  env: any,
  key: string,
  expiresIn = 300
) {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(getR2Client(env), command, { expiresIn });
}

/**
 * Generate a public URL for an object in R2.
 * Uses custom domain if configured, otherwise falls back to R2 S3 endpoint.
 */
export function getPublicUrl(env: any, key: string): string {
  const customDomain = env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN;
  if (customDomain && customDomain !== "pub-xxx.r2.dev") {
    return `https://${customDomain}/${key}`;
  }

  // Fallback: direct R2 S3 URL (bucket must be public-read)
  const accountId = env.R2_ACCOUNT_ID;
  const bucketName = env.R2_BUCKET_NAME;
  if (accountId && bucketName) {
    return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
  }

  throw new Error("R2 public URL cannot be constructed: missing R2_ACCOUNT_ID or R2_BUCKET_NAME");
}
export { getR2Client as r2Client };
