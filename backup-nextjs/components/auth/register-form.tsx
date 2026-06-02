"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/ui/toaster"

export function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"BUYER" | "SELLER">("BUYER")
  const [whatsapp, setWhatsapp] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, whatsapp }),
      })

      const data = await res.json()

      if (!res.ok) {
        addToast({
          title: "Gagal daftar",
          description: data.error || "Terjadi kesalahan",
          variant: "destructive",
        })
      } else {
        addToast({
          title: "Berhasil daftar",
          description: "Silakan masuk dengan akun Anda",
        })
        router.push("/login")
      }
    } catch {
      addToast({
        title: "Gagal daftar",
        description: "Terjadi kesalahan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nama</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Role</label>
        <Select value={role} onChange={(e) => setRole(e.target.value as "BUYER" | "SELLER")}>
          <option value="BUYER">Pembeli</option>
          <option value="SELLER">Penjual</option>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">WhatsApp (opsional)</label>
        <Input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="6281234567890"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Memuat..." : "Daftar"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-primary underline">
          Masuk
        </Link>
      </p>
    </form>
  )
}
