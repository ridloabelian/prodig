"use client"

import { useEffect, useState } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { SellerProductsTable } from "@/components/dashboard/seller-products-table"
import { WithdrawalForm, WithdrawalTable } from "@/components/dashboard/withdrawal-form"

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"products" | "sales" | "withdrawals">("products")
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const [statsRes, productsRes, withdrawalsRes] = await Promise.all([
      fetch("/api/seller/dashboard"),
      fetch("/api/seller/products"),
      fetch("/api/seller/withdrawals"),
    ])

    const [statsData, productsData, withdrawalsData] = await Promise.all([
      statsRes.json(),
      productsRes.json(),
      withdrawalsRes.json(),
    ])

    setStats(statsData)
    setProducts(productsData.products || [])
    setWithdrawals(withdrawalsData.withdrawals || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-muted rounded" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Seller Dashboard</h1>

      {stats && <StatsCards stats={stats} />}

      <div className="mt-8">
        <div className="border-b mb-4">
          <div className="flex gap-4">
            {(["products", "sales", "withdrawals"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "products"
                  ? "Produk Saya"
                  : tab === "sales"
                  ? "Penjualan"
                  : "Penarikan"}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "products" && (
          <SellerProductsTable products={products} />
        )}

        {activeTab === "sales" && (
          <div className="text-center py-8 text-muted-foreground">
            Detail penjualan per transaksi akan tersedia di Fase 1.1
          </div>
        )}

        {activeTab === "withdrawals" && (
          <div className="space-y-6">
            <WithdrawalForm
              availableBalance={stats?.availableBalance || 0}
              onSuccess={fetchData}
            />
            <WithdrawalTable withdrawals={withdrawals} />
          </div>
        )}
      </div>
    </div>
  )
}
