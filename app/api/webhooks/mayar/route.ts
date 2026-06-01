import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPurchaseSuccessEmail } from "@/lib/email"
import { addHours } from "date-fns"
import { watermarkPdf, isPdfFile } from "@/lib/watermark"

export async function POST(req: Request) {
  try {
    const payload = await req.json()

    // Log webhook
    await prisma.webhookLog.create({
      data: {
        provider: "mayar",
        eventId: payload.id || payload.paymentId || null,
        payload,
      },
    })

    const paymentId = payload.paymentId || payload.id || payload.data?.id
    const status = payload.status || payload.data?.status

    if (!paymentId) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // Idempotency check
    const existingLog = await prisma.webhookLog.findFirst({
      where: {
        provider: "mayar",
        eventId: paymentId,
        processed: true,
      },
    })

    if (existingLog) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const transaction = await prisma.transaction.findFirst({
      where: { mayarPaymentId: paymentId },
      include: {
        buyer: true,
        product: true,
      },
    })

    if (!transaction) {
      console.error("Transaction not found for payment:", paymentId)
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    if (status === "PAID" || status === "SETTLED") {
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "PAID",
            tokenExpiresAt: addHours(new Date(), 24),
          },
        }),
        prisma.product.update({
          where: { id: transaction.productId },
          data: { salesCount: { increment: 1 } },
        }),
      ])

      // Watermark PDF if applicable
      let watermarkedFileKey: string | undefined
      try {
        if (isPdfFile(transaction.product.fileKey)) {
          const wKey = `watermarked/${transaction.id}/${transaction.product.fileKey}`
          await watermarkPdf(
            transaction.product.fileKey,
            wKey,
            {
              buyerEmail: transaction.buyer.email || "",
              transactionId: transaction.id,
            }
          )
          watermarkedFileKey = wKey
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: { watermarkedFileKey: wKey },
          })
        }
      } catch (wmError) {
        console.error("Watermarking failed (non-blocking):", wmError)
        // Continue — buyer still gets original file
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      await sendPurchaseSuccessEmail(transaction.buyer.email, {
        productTitle: transaction.product.title,
        productPrice: transaction.subtotal,
        downloadUrl: `${appUrl}/download?token=${transaction.downloadToken}`,
        libraryUrl: `${appUrl}/library`,
      })
    } else if (status === "EXPIRED") {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "EXPIRED" },
      })
    } else if (status === "FAILED") {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED" },
      })
    }

    // Mark as processed
    await prisma.webhookLog.updateMany({
      where: { provider: "mayar", eventId: paymentId },
      data: { processed: true },
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}
