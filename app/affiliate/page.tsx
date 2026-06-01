"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toaster"

export default function AffiliatePage() {
  const [affiliate, setAffiliate] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const { addToast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    const [meRes, wdRes] = await Promise.all([
      fetch("/api/affiliate/me"),
      fetch("/api/affiliate/withdrawals"),
    ])
    const [meData, wdData] = await Promise.all([
      meRes.json(),
      wdRes.json(),
    ])
    setAffiliate(meData.affiliate)
    setStats(meData.stats)
    setWithdrawals(wdData.withdrawals || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount)
    if (!amount || amount < 50000) {
      addToast({
        title: "Minimum penarikan Rp 50.000",
        variant: "destructive",
      })
      return
    }
    const res = await fetch("/api/affiliate/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    })
    const data = await res.json()
    if (res.ok) {
      addToast({ title: "Permintaan penarikan berhasil diajukan" })
      setWithdrawAmount("")
      fetchData()
    } else {
      addToast({
        title: data.error || "Gagal",
        variant: "destructive",
      })
    }
  }

  const copyLink = () => {
    const link = `${window.location.origin}/products?ref=${affiliate?.code}`
    navigator.clipboard.writeText(link)
    addToast({ title: "Link affiliate disalin!" })
  }

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
      <h1 className="text-2xl font-bold mb-6">Affiliate Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-muted rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Total Penghasilan</div>
          <div className="text-2xl font-bold">
            Rp {(stats?.totalEarnings || 0).toLocaleString("id-ID")}
          </div>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Saldo Tersedia</div>
          <div className="text-2xl font-bold">
            Rp {(stats?.availableBalance || 0).toLocaleString("id-ID")}
          </div>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Total Referral</div>
          <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Komisi</div>
          <div className="text-2xl font-bold">{affiliate?.commissionPercent || 20}%</div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-muted rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-2">Link Referral</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Bagikan link ini ke teman-temanmu. Setiap pembelian melalui link ini akan mendapat komisi {affiliate?.commissionPercent || 20}%.
        </p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/products?ref=${affiliate?.code}`}
          />
          <Button onClick={copyLink}>Salin</Button>
        </div>
      </div>

      {/* Withdrawal */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-muted rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Penarikan Dana</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Jumlah (Rp)</label>
              <Input
                type="number"
                placeholder="Minimal 50.000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <Button onClick={handleWithdraw} className="w-full">
              Ajukan Penarikan
            </Button>
          </div>
        </div>

        <div className="bg-muted rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Riwayat Penarikan</h2>
          {withdrawals.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada penarikan</p>
          ) : (
            <div className="space-y-2">
              {withdrawals.map((w: any) => (
                <div
                  key={w.id}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      Rp {w.amount.toLocaleString("id-ID")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(w.createdAt).toLocaleDateString("id-ID")}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      w.status === "PROCESSED"
                        ? "bg-green-100 text-green-800"
                        : w.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
