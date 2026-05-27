"use client"

import { ProductCard } from "./product-card"

interface ProductGridProps {
  products: any[]
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">📭</div>
        <h3 className="text-lg font-medium">Tidak ada produk</h3>
        <p className="text-muted-foreground">
          Coba ubah filter atau kata kunci pencarian
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
