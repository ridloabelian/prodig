"use client"

import { Select } from "@/components/ui/select"

interface SortSelectProps {
  value: string
  onChange: (sort: string) => void
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="newest">Terbaru</option>
      <option value="bestselling">Terlaris</option>
      <option value="price_asc">Termurah</option>
      <option value="price_desc">Termahal</option>
    </Select>
  )
}
