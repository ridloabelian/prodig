"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Stats {
  totalProducts: number
  totalSales: number
  totalRevenue: number
  pendingWithdrawal: number
  availableBalance: number
}

export function StatsCards({ stats }: { stats: Stats }) {
  const items = [
    { label: "Total Produk", value: stats.totalProducts },
    { label: "Total Penjualan", value: stats.totalSales },
    { label: "Total Pendapatan", value: `Rp ${stats.totalRevenue.toLocaleString("id-ID")}` },
    { label: "Saldo Tersedia", value: `Rp ${stats.availableBalance.toLocaleString("id-ID")}` },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
