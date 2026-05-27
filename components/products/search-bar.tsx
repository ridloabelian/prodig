"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  value: string
  onSearch: (q: string) => void
}

export function SearchBar({ value, onSearch }: SearchBarProps) {
  const [q, setQ] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(q)
    }, 300)
    return () => clearTimeout(timer)
  }, [q, onSearch])

  return (
    <Input
      placeholder="Cari produk digital..."
      value={q}
      onChange={(e) => setQ(e.target.value)}
      className="max-w-md"
    />
  )
}
