import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

// Read and parse .env.local manually
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const firstEq = trimmed.indexOf("=");
    if (firstEq === -1) return;
    const key = trimmed.slice(0, firstEq).trim();
    let val = trimmed.slice(firstEq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
} catch (e) {
  console.error("Failed to read .env.local:", e);
}

console.log("R2_ACCOUNT_ID:", process.env.R2_ACCOUNT_ID);
console.log("R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID);
console.log("R2_SECRET_ACCESS_KEY:", process.env.R2_SECRET_ACCESS_KEY ? "EXISTS" : "MISSING");
console.log("R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME);

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

async function main() {
  const testKey = "test-connection-file.txt";
  try {
    console.log(`Trying to upload a file to bucket "${process.env.R2_BUCKET_NAME}"...`);
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: testKey,
      Body: "Hello R2!",
      ContentType: "text/plain",
    }));
    console.log("Upload test success!");

    console.log("Trying to delete test file...");
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: testKey,
    }));
    console.log("Delete test success!");
  } catch (err) {
    console.error("Error with R2 bucket operation:", err);
  }
}

main();
