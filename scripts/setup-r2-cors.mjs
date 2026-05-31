/**
 * Script untuk setup CORS policy di Cloudflare R2 bucket.
 * Jalankan: node scripts/setup-r2-cors.mjs
 *
 * Prerequisites:
 * - AWS CLI atau Wrangler CLI terinstall
 * - Atau bisa di-run langsung dari dashboard Cloudflare R2
 */

import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3"

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("❌ Environment variables R2_* belum lengkap. Pastikan .env.local di-load.")
  process.exit(1)
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

const corsConfig = {
  CORSRules: [
    {
      AllowedHeaders: ["*"],
      AllowedMethods: ["PUT", "GET", "POST", "DELETE", "HEAD"],
      AllowedOrigins: [
        "http://localhost:3000",
        "https://localhost:3000",
        "https://prodig.id",
        "https://www.prodig.id",
        // Tambahkan domain production di sini
      ],
      MaxAgeSeconds: 3600,
      ExposeHeaders: ["ETag", "x-amz-server-side-encryption"],
    },
  ],
}

async function setupCors() {
  try {
    const command = new PutBucketCorsCommand({
      Bucket: R2_BUCKET_NAME,
      CORSConfiguration: corsConfig,
    })
    await client.send(command)
    console.log(`✅ CORS policy berhasil di-set untuk bucket: ${R2_BUCKET_NAME}`)
    console.log("📋 Allowed Origins:")
    corsConfig.CORSRules[0].AllowedOrigins.forEach((origin) => console.log(`   - ${origin}`))
  } catch (error) {
    console.error("❌ Gagal set CORS:", error.message)
    process.exit(1)
  }
}

setupCors()
