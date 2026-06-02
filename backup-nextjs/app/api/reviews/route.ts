import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { addHours, isBefore } from "date-fns"

const reviewSchema = z.object({
  transactionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { transactionId, rating, comment } = parsed.data

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { reviews: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    if (transaction.buyerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (transaction.status !== "PAID") {
      return NextResponse.json(
        { error: "Transaction not paid" },
        { status: 403 }
      )
    }

    if (transaction.reviews.length > 0) {
      return NextResponse.json(
        { error: "Already reviewed" },
        { status: 409 }
      )
    }

    const cooldownTime = addHours(new Date(transaction.createdAt), 1)
    if (isBefore(new Date(), cooldownTime)) {
      return NextResponse.json(
        { error: "Review cooldown: wait 1 hour after purchase" },
        { status: 429 }
      )
    }

    const review = await prisma.review.create({
      data: {
        transactionId,
        productId: transaction.productId,
        buyerId: session.user.id,
        rating,
        comment: comment || null,
      },
      include: {
        buyer: { select: { id: true, name: true, image: true } },
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error("Review error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
