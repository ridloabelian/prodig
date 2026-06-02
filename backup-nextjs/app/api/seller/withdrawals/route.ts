import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const withdrawalSchema = z.object({
  amount: z.number().int().min(50000),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: { sellerId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ withdrawals })
  } catch (error) {
    console.error("Withdrawals list error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = withdrawalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { amount } = parsed.data

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user?.bankAccount || !user?.bankName) {
      return NextResponse.json(
        { error: "Please update your bank account in profile first" },
        { status: 400 }
      )
    }

    // Calculate available balance
    const [revenue, processedWithdrawals] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          product: { sellerId: session.user.id },
          status: "PAID",
        },
        _sum: { netAmount: true },
      }),
      prisma.withdrawal.aggregate({
        where: { sellerId: session.user.id, status: "PROCESSED" },
        _sum: { amount: true },
      }),
    ])

    const availableBalance =
      (revenue._sum.netAmount || 0) - (processedWithdrawals._sum.amount || 0)

    if (amount > availableBalance) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      )
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        sellerId: session.user.id,
        amount,
        status: "PENDING",
      },
    })

    return NextResponse.json({ withdrawal }, { status: 201 })
  } catch (error) {
    console.error("Withdrawal request error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
