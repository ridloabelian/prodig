import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPresignedDownloadUrl } from "@/lib/r2"
import { isBefore } from "date-fns"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    const trxId = searchParams.get("trx_id")

    let transaction: any = null

    if (token) {
      transaction = await prisma.transaction.findUnique({
        where: { downloadToken: token },
        include: { product: true },
      })

      if (!transaction) {
        return NextResponse.json(
          { error: "Invalid token" },
          { status: 404 }
        )
      }

      if (transaction.status !== "PAID") {
        return NextResponse.json(
          { error: "Transaction not paid" },
          { status: 403 }
        )
      }

      if (transaction.tokenExpiresAt && isBefore(new Date(transaction.tokenExpiresAt), new Date())) {
        return NextResponse.json(
          { error: "Token expired. Please access via Library." },
          { status: 410 }
        )
      }
    } else if (trxId) {
      const session = await getServerSession(authOptions)
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      transaction = await prisma.transaction.findUnique({
        where: { id: trxId },
        include: { product: true },
      })

      if (!transaction || transaction.buyerId !== session.user.id) {
        return NextResponse.json(
          { error: "Not found" },
          { status: 404 }
        )
      }

      if (transaction.status !== "PAID") {
        return NextResponse.json(
          { error: "Transaction not paid" },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Missing token or trx_id" },
        { status: 400 }
      )
    }

    // Rate limit check: 3 downloads per 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const downloadCount = await prisma.downloadLog.count({
      where: {
        transactionId: transaction.id,
        createdAt: { gte: twentyFourHoursAgo },
      },
    })

    if (downloadCount >= 3) {
      return NextResponse.json(
        { error: "Limit download tercapai. Coba lagi dalam 24 jam atau hubungi support." },
        { status: 429 }
      )
    }

    // Get presigned URL
    const downloadUrl = await getPresignedDownloadUrl(transaction.product.fileKey, 300)

    // Log download
    await prisma.downloadLog.create({
      data: {
        transactionId: transaction.id,
        userId: transaction.buyerId,
      },
    })

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    })

    return NextResponse.redirect(downloadUrl, 302)
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
