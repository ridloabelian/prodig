"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const trxId = searchParams.get("trx_id")
  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "failed">("loading")

  useEffect(() => {
    if (!trxId) return

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/library?trx_id=${trxId}`)
        const data = await res.json()
        if (data.transaction?.status === "PAID") {
          setStatus("paid")
        } else if (data.transaction?.status === "FAILED" || data.transaction?.status === "EXPIRED") {
          setStatus("failed")
        } else {
          setStatus("pending")
        }
      } catch {
        setStatus("pending")
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 3000)
    const timeout = setTimeout(() => clearInterval(interval), 30000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [trxId])

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      {status === "loading" && (
        <div className="space-y-4">
          <div className="text-4xl">⏳</div>
          <h1 className="text-2xl font-bold">Memverifikasi Pembayaran...</h1>
          <p className="text-muted-foreground">
            Mohon tunggu, kami sedang memproses pembayaranmu.
          </p>
        </div>
      )}

      {status === "paid" && (
        <div className="space-y-4">
          <div className="text-4xl">🎉</div>
          <h1 className="text-2xl font-bold">Pembayaran Berhasil!</h1>
          <p className="text-muted-foreground">
            Produk telah ditambahkan ke library-mu.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/library">
              <Button>Lihat Library</Button>
            </Link>
            <Link href="/products">
              <Button variant="outline">Lanjut Belanja</Button>
            </Link>
          </div>
        </div>
      )}

      {status === "pending" && (
        <div className="space-y-4">
          <div className="text-4xl">⏳</div>
          <h1 className="text-2xl font-bold">Menunggu Konfirmasi</h1>
          <p className="text-muted-foreground">
            Pembayaran masih diproses. Kamu akan menerima email konfirmasi setelah berhasil.
          </p>
          <Link href="/library">
            <Button variant="outline">Cek Library</Button>
          </Link>
        </div>
      )}

      {status === "failed" && (
        <div className="space-y-4">
          <div className="text-4xl">❌</div>
          <h1 className="text-2xl font-bold">Pembayaran Gagal</h1>
          <p className="text-muted-foreground">
            Pembayaran tidak berhasil. Silakan coba lagi.
          </p>
          <Link href="/products">
            <Button>Coba Lagi</Button>
          </Link>
        </div>
      )}
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-4xl">⏳</div>
        <h1 className="text-2xl font-bold mt-4">Memuat...</h1>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
