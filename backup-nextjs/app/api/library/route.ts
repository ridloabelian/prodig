import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const trxId = searchParams.get("trx_id")

    if (trxId) {
      const transaction = await prisma.transaction.findUnique({
        where: { id: trxId },
      })
      return NextResponse.json({ transaction })
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        buyerId: session.user.id,
        status: "PAID",
      },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            fileName: true,
            seller: {
              select: { name: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error("Library error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
