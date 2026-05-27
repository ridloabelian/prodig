import Link from "next/link"
export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { ProductCard } from "@/components/products/product-card"
import { Button } from "@/components/ui/button"

async function getFeaturedProducts() {
  const products = await prisma.product.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      seller: { select: { id: true, name: true, image: true } },
      category: { select: { id: true, name: true, slug: true } },
      reviews: { select: { rating: true } },
    },
  })

  return products.map((p) => ({
    ...p,
    avgRating: p.reviews.length
      ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
      : 0,
    reviewCount: p.reviews.length,
  }))
}

async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } })
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Marketplace Produk Digital Indonesia
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Jual dan beli e-book, template, course, preset, font, dan produk digital berkualitas dari kreator lokal
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/products">
              <Button size="lg">Jelajahi Produk</Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline">
                Mulai Jualan
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Kategori</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="p-4 rounded-xl border bg-card text-center hover:shadow-md transition-shadow"
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="text-sm font-medium">{cat.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Produk Terbaru</h2>
          <Link href="/products">
            <Button variant="ghost">Lihat Semua →</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">Cara Kerja</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📤</div>
              <h3 className="font-semibold mb-2">1. Upload Produk</h3>
              <p className="text-muted-foreground">
                Seller upload file digital beserta deskripsi dan harga
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="font-semibold mb-2">2. Checkout Otomatis</h3>
              <p className="text-muted-foreground">
                Buyer bayar via QRIS, VA, atau e-wallet melalui Mayar.id
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📥</div>
              <h3 className="font-semibold mb-2">3. Instant Download</h3>
              <p className="text-muted-foreground">
                File langsung tersedia di library setelah pembayaran sukses
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
