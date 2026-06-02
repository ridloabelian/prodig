import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(50).max(5000),
  price: z.number().int().min(10000).max(200000),
  categoryId: z.string().uuid(),
  fileKey: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  thumbnail: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        sellerId: session.user.id,
        status: "PENDING",
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error("Create product error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const category = searchParams.get("category") || ""
    const sort = searchParams.get("sort") || "newest"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)
    const skip = (page - 1) * limit

    let products: any[] = []
    let total = 0

    if (q) {
      // Full-text search using PostgreSQL tsvector
      const searchResults = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Product"
        WHERE status = 'APPROVED'
          AND to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
              @@ plainto_tsquery('simple', ${q})
        ORDER BY ts_rank(
          to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')),
          plainto_tsquery('simple', ${q})
        ) DESC
        LIMIT ${limit} OFFSET ${skip}
      `

      const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "Product"
        WHERE status = 'APPROVED'
          AND to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
              @@ plainto_tsquery('simple', ${q})
      `
      total = Number(countResult[0].count)

      const ids = searchResults.map((r) => r.id)
      if (ids.length > 0) {
        const fetched = await prisma.product.findMany({
          where: { id: { in: ids } },
          include: {
            seller: { select: { id: true, name: true, image: true } },
            category: { select: { id: true, name: true, slug: true } },
            reviews: { select: { rating: true } },
          },
        })
        // Preserve search ranking order
        const productMap = new Map(fetched.map((p) => [p.id, p]))
        products = ids.map((id) => productMap.get(id)).filter(Boolean) as any[]
      }
    } else {
      const where: any = { status: "APPROVED" }

      if (category) {
        where.category = { slug: category }
      }

      let orderBy: any = {}
      switch (sort) {
        case "bestselling":
          orderBy = { salesCount: "desc" }
          break
        case "price_asc":
          orderBy = { price: "asc" }
          break
        case "price_desc":
          orderBy = { price: "desc" }
          break
        default:
          orderBy = { createdAt: "desc" }
      }

      const [fetched, count] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            seller: { select: { id: true, name: true, image: true } },
            category: { select: { id: true, name: true, slug: true } },
            reviews: { select: { rating: true } },
          },
        }),
        prisma.product.count({ where }),
      ])
      products = fetched
      total = count
    }

    const mapped = products.map((p) => ({
      ...p,
      avgRating: p.reviews.length
        ? p.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / p.reviews.length
        : 0,
      reviewCount: p.reviews.length,
    }))

    return NextResponse.json({
      products: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("List products error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
