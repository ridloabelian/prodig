"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/toaster"

export default function ProductDetailPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { addToast } = useToast()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    // Track affiliate ref from URL
    const ref = searchParams.get("ref")
    if (ref) {
      document.cookie = `affiliate_code=${ref}; max-age=${30 * 24 * 60 * 60}; path=/`
    }
  }, [searchParams])

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data.product)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleCheckout = async () => {
    if (!session) {
      addToast({
        title: "Silakan masuk",
        description: "Anda perlu login untuk membeli produk",
        variant: "destructive",
      })
      return
    }

    setCheckingOut(true)
    try {
      // Read affiliate code from cookie
      const affiliateCode = document.cookie
        .split("; ")
        .find((row) => row.startsWith("affiliate_code="))
        ?.split("=")[1]

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, affiliateCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        addToast({
          title: "Gagal checkout",
          description: data.error || "Terjadi kesalahan",
          variant: "destructive",
        })
      } else {
        window.location.href = data.invoiceUrl
      }
    } catch {
      addToast({
        title: "Gagal checkout",
        description: "Terjadi kesalahan",
        variant: "destructive",
      })
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-muted rounded-xl" />
          <div className="h-8 w-1/2 bg-muted rounded" />
          <div className="h-4 w-1/4 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Produk tidak ditemukan</h1>
        <Link href="/products">
          <Button className="mt-4">Kembali ke Katalog</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Image */}
        <div>
          <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
            <img
              src={product.thumbnail}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right: Info */}
        <div className="space-y-6">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              {product.category.name}
            </div>
            <h1 className="text-3xl font-bold">{product.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="text-sm text-muted-foreground">
                oleh {product.seller.name || "Penjual"}
              </div>
              <span className="text-muted-foreground">·</span>
              <div className="text-sm text-muted-foreground">
                {product.salesCount} terjual
              </div>
              <span className="text-muted-foreground">·</span>
              <div className="text-sm text-muted-foreground">
                {product.viewCount} dilihat
              </div>
            </div>
            {product.avgRating > 0 && (
              <div className="mt-1 text-yellow-600">
                {"★".repeat(Math.round(product.avgRating))}
                <span className="text-muted-foreground ml-1">
                  ({product._count?.reviews || 0} ulasan)
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">
              Rp {product.price.toLocaleString("id-ID")}
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between gap-4">
                <span>Harga Produk</span>
                <span>Rp {product.price.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>PPN 11%</span>
                <span>Rp {Math.floor(product.price * 0.11).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between gap-4 font-semibold text-foreground border-t pt-1">
                <span>Total</span>
                <span>Rp {(product.price + Math.floor(product.price * 0.11)).toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{product.description}</p>
          </div>

          <Button
            size="lg"
            className="w-full md:w-auto"
            onClick={handleCheckout}
            disabled={checkingOut}
          >
            {checkingOut ? "Memuat..." : "Beli Sekarang"}
          </Button>
        </div>
      </div>

      {/* Reviews */}
      {product.reviews && product.reviews.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Ulasan Pembeli</h2>
          <div className="space-y-4">
            {product.reviews.map((review: any) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-medium">
                      {review.buyer.name || "Pembeli"}
                    </div>
                    <div className="text-yellow-600">
                      {"★".repeat(review.rating)}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-muted-foreground">{review.comment}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
