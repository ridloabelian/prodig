import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib"
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

/**
 * Download a file from R2 into a Buffer
 */
async function downloadFromR2(key: string): Promise<Buffer> {
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  })
  const response = await client.send(command)
  const stream = response.Body as any
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/**
 * Upload a Buffer to R2
 */
async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<void> {
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })
  await client.send(command)
}

/**
 * Add watermark text to every page of a PDF
 */
export async function watermarkPdf(
  fileKey: string,
  watermarkedKey: string,
  metadata: {
    buyerEmail: string
    transactionId: string
  }
): Promise<void> {
  // Download original PDF
  const pdfBuffer = await downloadFromR2(fileKey)

  // Load with pdf-lib
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pages = pdfDoc.getPages()
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const watermarkText = `Licensed to: ${metadata.buyerEmail}  |  Order: ${metadata.transactionId}`
  const fontSize = 14

  for (const page of pages) {
    const { width, height } = page.getSize()

    // Measure text
    const textWidth = helveticaBold.widthOfTextAtSize(watermarkText, fontSize)

    // Draw semi-transparent watermark diagonally in center
    page.drawText(watermarkText, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font: helveticaBold,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.35,
      rotate: degrees(-30),
    })
  }

  // Save watermarked PDF
  const watermarkedPdfBytes = await pdfDoc.save()
  const watermarkedBuffer = Buffer.from(watermarkedPdfBytes)

  // Upload to R2
  await uploadToR2(watermarkedKey, watermarkedBuffer, "application/pdf")
}

/**
 * Check if a file is a PDF based on its key/name
 */
export function isPdfFile(fileKey: string): boolean {
  return fileKey.toLowerCase().endsWith(".pdf")
}
