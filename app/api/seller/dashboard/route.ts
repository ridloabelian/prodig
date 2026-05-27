import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sellerId = session.user.id

    const [totalProducts, totalSales, totalRevenue, pendingWithdrawal, processedWithdrawal] =
      await Promise.all([
        prisma.product.count({ where: { sellerId } }),
        prisma.transaction.count({
          where: { product: { sellerId }, status: "PAID" },
        }),
        prisma.transaction.aggregate({
          where: { product: { sellerId }, status: "PAID" },
          _sum: { netAmount: true },
        }),
        prisma.withdrawal.aggregate({
          where: { sellerId, status: "PENDING" },
          _sum: { amount: true },
        }),
        prisma.withdrawal.aggregate({
          where: { sellerId, status: "PROCESSED" },
          _sum: { amount: true },
        }),
      ])

    const revenue = totalRevenue._sum.netAmount || 0
    const processed = processedWithdrawal._sum.amount || 0
    const availableBalance = revenue - processed

    return NextResponse.json({
      totalProducts,
      totalSales,
      totalRevenue: revenue,
      pendingWithdrawal: pendingWithdrawal._sum.amount || 0,
      availableBalance,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
