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

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
    })

    if (!affiliate) {
      return NextResponse.json({ withdrawals: [] })
    }

    const withdrawals = await prisma.affiliateWithdrawal.findMany({
      where: { affiliateId: affiliate.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ withdrawals })
  } catch (error) {
    console.error("Affiliate withdrawals list error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { amount } = body

    if (!amount || amount < 50000) {
      return NextResponse.json(
        { error: "Minimum withdrawal Rp 50.000" },
        { status: 400 }
      )
    }

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
    })

    if (!affiliate || affiliate.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Affiliate not active" },
        { status: 403 }
      )
    }

    // Calculate available balance
    const processed = await prisma.affiliateWithdrawal.aggregate({
      where: { affiliateId: affiliate.id, status: "PROCESSED" },
      _sum: { amount: true },
    })
    const pending = await prisma.affiliateWithdrawal.aggregate({
      where: { affiliateId: affiliate.id, status: "PENDING" },
      _sum: { amount: true },
    })

    const available = affiliate.totalEarnings - (processed._sum.amount || 0) - (pending._sum.amount || 0)

    if (amount > available) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      )
    }

    const withdrawal = await prisma.affiliateWithdrawal.create({
      data: {
        affiliateId: affiliate.id,
        amount,
        status: "PENDING",
      },
    })

    return NextResponse.json({ withdrawal }, { status: 201 })
  } catch (error) {
    console.error("Affiliate withdrawal request error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
