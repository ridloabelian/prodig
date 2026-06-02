import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

/**
 * Check if a file is a PDF based on its key/name
 */
export function isPdfFile(fileKey: string): boolean {
  return fileKey.toLowerCase().endsWith(".pdf");
}

/**
 * Add watermark text to every page of a PDF and upload to R2
 */
export async function watermarkPdf(
  env: any,
  fileKey: string,
  watermarkedKey: string,
  metadata: {
    buyerEmail: string;
    transactionId: string;
  }
): Promise<void> {
  const bucket = env.R2_FILES;
  if (!bucket) {
    throw new Error("Cloudflare R2 Bucket binding 'R2_FILES' is not configured.");
  }

  // 1. Download original PDF from R2 using native binding
  const object = await bucket.get(fileKey);
  if (!object) {
    throw new Error(`Berkas asli tidak ditemukan di R2: ${fileKey}`);
  }

  const arrayBuffer = await object.arrayBuffer();
  const pdfBytes = new Uint8Array(arrayBuffer);

  // 2. Load and edit PDF with pdf-lib
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const watermarkText = `Licensed to: ${metadata.buyerEmail}  |  Order: ${metadata.transactionId}`;
  const fontSize = 12;

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Measure text width
    const textWidth = helveticaBold.widthOfTextAtSize(watermarkText, fontSize);

    // Draw semi-transparent watermark diagonally in center
    page.drawText(watermarkText, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font: helveticaBold,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.35,
      rotate: degrees(-30),
    });
  }

  // 3. Save watermarked PDF
  const watermarkedPdfBytes = await pdfDoc.save();

  // 4. Upload watermarked PDF back to R2 using native binding
  await bucket.put(watermarkedKey, watermarkedPdfBytes, {
    httpMetadata: {
      contentType: "application/pdf",
    },
  });
}
