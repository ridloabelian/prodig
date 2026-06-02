"use client"

import { useState, useEffect, useCallback } from "react"
import { ProductGrid } from "@/components/products/product-grid"
import { SearchBar } from "@/components/products/search-bar"
import { CategoryFilter } from "@/components/products/category-filter"
import { SortSelect } from "@/components/products/sort-select"

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("")
  const [sort, setSort] = useState("newest")

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (category) params.set("category", category)
    if (sort) params.set("sort", sort)

    const res = await fetch(`/api/products?${params.toString()}`)
    const data = await res.json()
    setProducts(data.products || [])
    setLoading(false)
  }, [q, category, sort])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Jelajahi Produk</h1>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <SearchBar value={q} onSearch={setQ} />
          <SortSelect value={sort} onChange={setSort} />
        </div>
        <div className="mt-4">
          <CategoryFilter value={category} onChange={setCategory} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse bg-muted rounded-xl" />
          ))}
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  )
}
