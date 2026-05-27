import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, image: true } },
        category: { select: { id: true, name: true, slug: true } },
        reviews: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            buyer: { select: { id: true, name: true, image: true } },
          },
        },
        _count: { select: { reviews: true } },
      },
    })

    if (!product || product.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Increment view count async
    prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(console.error)

    const avgRating = product.reviews.length
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0

    return NextResponse.json({
      product: {
        ...product,
        avgRating,
      },
    })
  } catch (error) {
    console.error("Product detail error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
