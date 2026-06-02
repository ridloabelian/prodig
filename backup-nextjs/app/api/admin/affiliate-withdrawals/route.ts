import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const withdrawals = await prisma.affiliateWithdrawal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        affiliate: {
          include: {
            user: {
              select: { name: true, email: true, bankName: true, bankAccount: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ withdrawals })
  } catch (error) {
    console.error("Admin affiliate withdrawals error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const body = await req.json()
    const { status, notes } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status" },
        { status: 400 }
      )
    }

    const withdrawal = await prisma.affiliateWithdrawal.update({
      where: { id },
      data: {
        status,
        notes: notes || undefined,
        processedAt: status === "PROCESSED" || status === "REJECTED" ? new Date() : undefined,
      },
    })

    return NextResponse.json({ withdrawal })
  } catch (error) {
    console.error("Admin affiliate withdrawal update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
