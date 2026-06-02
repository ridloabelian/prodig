import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createMayarInvoice } from "@/lib/mayar"
import { z } from "zod"

const checkoutSchema = z.object({
  productId: z.string().uuid(),
  affiliateCode: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      )
    }

    const { productId, affiliateCode } = parsed.data

    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product || product.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Product not available" },
        { status: 404 }
      )
    }

    // Check if already purchased
    const existing = await prisma.transaction.findFirst({
      where: {
        buyerId: session.user.id,
        productId,
        status: "PAID",
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "You already purchased this product" },
        { status: 409 }
      )
    }

    // Resolve affiliate
    let affiliateId: string | undefined
    let affiliateCommission = 0
    if (affiliateCode) {
      const affiliate = await prisma.affiliate.findUnique({
        where: { code: affiliateCode },
      })
      if (affiliate && affiliate.status === "ACTIVE" && affiliate.userId !== session.user.id) {
        affiliateId = affiliate.id
        affiliateCommission = Math.floor(product.price * affiliate.commissionPercent / 100)
      }
    }

    const platformFeePercent = parseInt(process.env.PLATFORM_FEE_PERCENT || "10")
    const commission = Math.floor(product.price * platformFeePercent / 100)
    const netAmount = product.price - commission - affiliateCommission
    const ppn = Math.floor(product.price * 11 / 100)
    const totalAmount = product.price + ppn

    const transaction = await prisma.transaction.create({
      data: {
        buyerId: session.user.id,
        productId,
        subtotal: product.price,
        ppn,
        amount: totalAmount,
        commission,
        netAmount,
        affiliateId,
        affiliateCommission,
        status: "PENDING",
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const mayarRes = await createMayarInvoice({
      amount: totalAmount,
      description: `Pembelian ${product.title} di Prodig.id`,
      customerName: session.user.name || "Customer",
      customerEmail: session.user.email || "",
      redirectUrl: `${appUrl}/checkout/success?trx_id=${transaction.id}`,
      webhookUrl: `${appUrl}/api/webhooks/mayar`,
      externalId: transaction.id,
    })

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        mayarPaymentId: mayarRes.data?.id || mayarRes.id,
        mayarInvoiceUrl: mayarRes.data?.paymentUrl || mayarRes.paymentUrl,
      },
    })

    return NextResponse.json({
      invoiceUrl: mayarRes.data?.paymentUrl || mayarRes.paymentUrl,
      transactionId: transaction.id,
    })
  } catch (error: any) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
