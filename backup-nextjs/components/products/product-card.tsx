"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

interface ProductCardProps {
  product: {
    id: string
    title: string
    price: number
    thumbnail: string
    salesCount: number
    avgRating: number
    reviewCount: number
    seller: { name: string | null; image: string | null }
    category: { name: string }
  }
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-lg h-full flex flex-col">
        <div className="aspect-video bg-gray-100 relative">
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>
        <CardContent className="p-4 flex flex-col flex-1">
          <div className="text-xs text-muted-foreground mb-1">
            {product.category.name}
          </div>
          <h3 className="font-semibold line-clamp-2 flex-1">{product.title}</h3>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-bold text-primary">
              Rp {product.price.toLocaleString("id-ID")}
            </span>
            <span className="text-xs text-muted-foreground">
              {product.salesCount} terjual
            </span>
          </div>
          {product.reviewCount > 0 && (
            <div className="mt-1 text-xs text-yellow-600">
              {"★".repeat(Math.round(product.avgRating))}
              <span className="text-muted-foreground ml-1">
                ({product.reviewCount})
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
