"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toaster"

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"products" | "withdrawals" | "affiliateWithdrawals">("products")
  const [products, setProducts] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [affiliateWithdrawals, setAffiliateWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [productStatus, setProductStatus] = useState("PENDING")
  const { addToast } = useToast()

  const fetchProducts = async () => {
    const res = await fetch(`/api/admin/products?status=${productStatus}`)
    const data = await res.json()
    setProducts(data.products || [])
  }

  const fetchWithdrawals = async () => {
    const res = await fetch("/api/admin/withdrawals")
    const data = await res.json()
    setWithdrawals(data.withdrawals || [])
  }

  const fetchAffiliateWithdrawals = async () => {
    const res = await fetch("/api/admin/affiliate-withdrawals")
    const data = await res.json()
    setAffiliateWithdrawals(data.withdrawals || [])
  }

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([
      fetchProducts(),
      fetchWithdrawals(),
      fetchAffiliateWithdrawals(),
    ])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [productStatus])

  const handleProductAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })

    if (res.ok) {
      addToast({ title: `Produk ${status === "APPROVED" ? "disetujui" : "ditolak"}` })
      fetchProducts()
    } else {
      addToast({ title: "Gagal", description: "Terjadi kesalahan", variant: "destructive" })
    }
  }

  const handleWithdrawalAction = async (id: string, status: "PROCESSED" | "REJECTED") => {
    const res = await fetch(`/api/admin/withdrawals?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })

    if (res.ok) {
      addToast({ title: `Penarikan ${status === "PROCESSED" ? "diproses" : "ditolak"}` })
      fetchWithdrawals()
    } else {
      addToast({ title: "Gagal", description: "Terjadi kesalahan", variant: "destructive" })
    }
  }

  const handleAffiliateWithdrawalAction = async (id: string, status: "PROCESSED" | "REJECTED") => {
    const res = await fetch(`/api/admin/affiliate-withdrawals?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })

    if (res.ok) {
      addToast({ title: `Penarikan affiliate ${status === "PROCESSED" ? "diproses" : "ditolak"}` })
      fetchAffiliateWithdrawals()
    } else {
      addToast({ title: "Gagal", description: "Terjadi kesalahan", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      <div className="border-b mb-4">
        <div className="flex gap-4">
          {([
            { key: "products", label: "Moderasi Produk" },
            { key: "withdrawals", label: "Penarikan Seller" },
            { key: "affiliateWithdrawals", label: "Penarikan Affiliate" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "products" && (
        <div>
          <div className="flex gap-2 mb-4">
            {["PENDING", "APPROVED", "REJECTED", "ALL"].map((s) => (
              <button
                key={s}
                onClick={() => setProductStatus(s)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  productStatus === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Produk</th>
                  <th className="text-left py-3 px-4">Penjual</th>
                  <th className="text-left py-3 px-4">Kategori</th>
                  <th className="text-left py-3 px-4">Harga</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-3 px-4 font-medium">{p.title}</td>
                    <td className="py-3 px-4">{p.seller.name || p.seller.email}</td>
                    <td className="py-3 px-4">{p.category.name}</td>
                    <td className="py-3 px-4">
                      Rp {p.price.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleProductAction(p.id, "APPROVED")}
                        >
                          Setuju
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleProductAction(p.id, "REJECTED")}
                        >
                          Tolak
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Tidak ada produk
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "withdrawals" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Penjual</th>
                <th className="text-left py-3 px-4">Jumlah</th>
                <th className="text-left py-3 px-4">Bank</th>
                <th className="text-left py-3 px-4">Rekening</th>
                <th className="text-left py-3 px-4">Tanggal</th>
                <th className="text-left py-3 px-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id} className="border-b">
                  <td className="py-3 px-4">{w.seller.name || w.seller.email}</td>
                  <td className="py-3 px-4">Rp {w.amount.toLocaleString("id-ID")}</td>
                  <td className="py-3 px-4">{w.seller.bankName || "-"}</td>
                  <td className="py-3 px-4">{w.seller.bankAccount || "-"}</td>
                  <td className="py-3 px-4">
                    {new Date(w.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleWithdrawalAction(w.id, "PROCESSED")}
                      >
                        Proses
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleWithdrawalAction(w.id, "REJECTED")}
                      >
                        Tolak
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {withdrawals.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada permintaan penarikan
            </div>
          )}
        </div>
      )}

      {activeTab === "affiliateWithdrawals" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Affiliate</th>
                <th className="text-left py-3 px-4">Jumlah</th>
                <th className="text-left py-3 px-4">Bank</th>
                <th className="text-left py-3 px-4">Rekening</th>
                <th className="text-left py-3 px-4">Tanggal</th>
                <th className="text-left py-3 px-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {affiliateWithdrawals.map((w) => (
                <tr key={w.id} className="border-b">
                  <td className="py-3 px-4">{w.affiliate.user.name || w.affiliate.user.email}</td>
                  <td className="py-3 px-4">Rp {w.amount.toLocaleString("id-ID")}</td>
                  <td className="py-3 px-4">{w.affiliate.user.bankName || "-"}</td>
                  <td className="py-3 px-4">{w.affiliate.user.bankAccount || "-"}</td>
                  <td className="py-3 px-4">
                    {new Date(w.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAffiliateWithdrawalAction(w.id, "PROCESSED")}
                      >
                        Proses
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAffiliateWithdrawalAction(w.id, "REJECTED")}
                      >
                        Tolak
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {affiliateWithdrawals.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada permintaan penarikan affiliate
            </div>
          )}
        </div>
      )}
    </div>
  )
}
