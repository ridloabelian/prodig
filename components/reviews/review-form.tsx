"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toaster"

interface ReviewFormProps {
  transactionId: string
  onSuccess?: () => void
}

export function ReviewForm({ transactionId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, rating, comment }),
      })

      const data = await res.json()

      if (!res.ok) {
        addToast({
          title: "Gagal",
          description: data.error || "Terjadi kesalahan",
          variant: "destructive",
        })
      } else {
        addToast({ title: "Ulasan berhasil dikirim" })
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
        <label className="text-sm font-medium">Rating</label>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl transition-colors ${
                star <= rating ? "text-yellow-500" : "text-gray-300"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Ulasan (opsional)</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Bagaimana pengalamanmu dengan produk ini?"
          minLength={10}
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Mengirim..." : "Kirim Ulasan"}
      </Button>
    </form>
  )
}
