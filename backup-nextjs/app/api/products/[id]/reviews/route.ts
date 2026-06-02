import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = 10
    const skip = (page - 1) * limit

    const reviews = await prisma.review.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        buyer: { select: { id: true, name: true, image: true } },
      },
    })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("Product reviews error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
