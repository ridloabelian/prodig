import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        seller: { select: { id: true, name: true, email: true, bankName: true, bankAccount: true } },
      },
    })

    return NextResponse.json({ withdrawals })
  } catch (error) {
    console.error("Admin withdrawals error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

const patchSchema = z.object({
  status: z.enum(["PROCESSED", "REJECTED"]),
  notes: z.string().optional(),
})

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      )
    }

    const { status, notes } = parsed.data

    const withdrawal = await prisma.withdrawal.update({
      where: { id },
      data: {
        status,
        notes: notes || undefined,
        processedAt: status === "PROCESSED" ? new Date() : undefined,
      },
    })

    return NextResponse.json({ withdrawal })
  } catch (error) {
    console.error("Admin withdrawal update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
