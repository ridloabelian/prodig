import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
    })

    if (!affiliate) {
      // Auto-create affiliate record
      affiliate = await prisma.affiliate.create({
        data: {
          userId: session.user.id,
          commissionPercent: 20,
          status: "ACTIVE",
        },
      })
    }

    // Calculate pending balance (unwithdrawn earnings)
    const processedWithdrawals = await prisma.affiliateWithdrawal.aggregate({
      where: { affiliateId: affiliate.id, status: "PROCESSED" },
      _sum: { amount: true },
    })

    const pendingWithdrawals = await prisma.affiliateWithdrawal.aggregate({
      where: { affiliateId: affiliate.id, status: "PENDING" },
      _sum: { amount: true },
    })

    const withdrawn = processedWithdrawals._sum.amount || 0
    const pendingWithdrawal = pendingWithdrawals._sum.amount || 0
    const availableBalance = affiliate.totalEarnings - withdrawn - pendingWithdrawal

    return NextResponse.json({
      affiliate,
      stats: {
        totalEarnings: affiliate.totalEarnings,
        totalReferrals: affiliate.totalReferrals,
        availableBalance,
        withdrawn,
        pendingWithdrawal,
      },
    })
  } catch (error) {
    console.error("Affiliate me error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
