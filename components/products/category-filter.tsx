"use client"

import { useState, useEffect } from "react"

interface Category {
  id: string
  name: string
  slug: string
}

interface CategoryFilterProps {
  value: string
  onChange: (slug: string) => void
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(console.error)
  }, [])

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("")}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          value === ""
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        Semua
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.slug)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            value === cat.slug
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
