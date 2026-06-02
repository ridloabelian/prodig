"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toaster"

interface Withdrawal {
  id: string
  amount: number
  status: string
  createdAt: string
}

export function WithdrawalForm({
  availableBalance,
  onSuccess,
}: {
  availableBalance: number
  onSuccess?: () => void
}) {
  const [amount, setAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch("/api/seller/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseInt(amount) }),
      })

      const data = await res.json()

      if (!res.ok) {
        addToast({
          title: "Gagal",
          description: data.error || "Terjadi kesalahan",
          variant: "destructive",
        })
      } else {
        addToast({ title: "Permintaan penarikan berhasil diajukan" })
        setAmount("")
        onSuccess?.()
      }
    } catch {
      addToast({
        title: "Gagal",
        description: "Terjadi kesalahan",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Jumlah Penarikan</label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min={50000}
          max={availableBalance}
          placeholder="50000"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Saldo tersedia: Rp {availableBalance.toLocaleString("id-ID")} (min Rp 50.000)
        </p>
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Mengajukan..." : "Ajukan Penarikan"}
      </Button>
    </form>
  )
}

export function WithdrawalTable({ withdrawals }: { withdrawals: Withdrawal[] }) {
  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4">Jumlah</th>
            <th className="text-left py-3 px-4">Status</th>
            <th className="text-left py-3 px-4">Tanggal</th>
          </tr>
        </thead>
        <tbody>
          {withdrawals.map((w) => (
            <tr key={w.id} className="border-b">
              <td className="py-3 px-4">
                Rp {w.amount.toLocaleString("id-ID")}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    statusColors[w.status] || "bg-gray-100"
                  }`}
                >
                  {w.status}
                </span>
              </td>
              <td className="py-3 px-4">
                {new Date(w.createdAt).toLocaleDateString("id-ID")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {withdrawals.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Belum ada penarikan
        </div>
      )}
    </div>
  )
}
