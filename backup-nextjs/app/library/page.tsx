"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function LibraryPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/library")
      .then((res) => res.json())
      .then((data) => {
        setTransactions(data.transactions || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">📚</div>
        <h1 className="text-2xl font-bold">Library Kosong</h1>
        <p className="text-muted-foreground mt-2">
          Kamu belum membeli produk apapun
        </p>
        <Link href="/products">
          <Button className="mt-4">Jelajahi Produk</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Library Saya</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {transactions.map((trx) => (
          <Card key={trx.id} className="overflow-hidden">
            <div className="aspect-video bg-gray-100">
              <img
                src={trx.product.thumbnail}
                alt={trx.product.title}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold line-clamp-2">{trx.product.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                oleh {trx.product.seller.name || "Penjual"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Dibeli {new Date(trx.createdAt).toLocaleDateString("id-ID")}
              </p>
              {trx.product.fileName?.toLowerCase().endsWith(".pdf") && (
                <p className="text-xs text-blue-600 mt-1">
                  {trx.watermarkedFileKey ? "🔒 PDF Watermarked" : "📄 PDF"}
                </p>
              )}
              <a
                href={`/api/download?trx_id=${trx.id}`}
                className="mt-3 w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
              >
                Download
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
