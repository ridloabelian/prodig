"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { FileUploader } from "./file-uploader"
import { useToast } from "@/components/ui/toaster"

interface Category {
  id: string
  name: string
}

export function ProductUploadForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const { addToast } = useToast()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [fileKey, setFileKey] = useState("")
  const [fileName, setFileName] = useState("")
  const [fileSize, setFileSize] = useState(0)
  const [thumbnail, setThumbnail] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleFileUpload = (key: string, name: string, size: number) => {
    setFileKey(key)
    setFileName(name)
    setFileSize(size)
  }

  const handleThumbnailUpload = (key: string, name: string) => {
    // For thumbnail, we use the R2 public URL or a direct URL
    // In production, you'd have a public bucket or CDN. For now, we construct a URL.
    setThumbnail(`https://${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "placeholder"}/${key}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileKey) {
      addToast({
        title: "File belum diupload",
        description: "Silakan upload file produk terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price: parseInt(price),
          categoryId,
          fileKey,
          fileName,
          fileSize,
          thumbnail: thumbnail || "/placeholder.png",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        addToast({
          title: "Gagal upload",
          description: data.error || "Terjadi kesalahan",
          variant: "destructive",
        })
      } else {
        addToast({
          title: "Produk berhasil diupload",
          description: "Produk sedang direview oleh tim kami",
        })
        router.push("/dashboard")
      }
    } catch {
      addToast({
        title: "Gagal upload",
        description: "Terjadi kesalahan",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <label className="text-sm font-medium">Judul Produk *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={5}
          maxLength={100}
          placeholder="Contoh: Template Laporan Keuangan UMKM"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Kategori *</label>
        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          <option value="">Pilih kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">Harga (Rp) *</label>
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          min={10000}
          max={200000}
          placeholder="10000"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Min Rp 10.000, Max Rp 200.000 untuk Fase 1
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Deskripsi *</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={50}
          maxLength={5000}
          rows={5}
          placeholder="Jelaskan detail produk, fitur, dan cara penggunaannya..."
        />
      </div>

      <div>
        <label className="text-sm font-medium">Thumbnail *</label>
        <FileUploader
          type="thumbnail"
          accept="image/jpeg,image/png,image/webp"
          onUploadComplete={handleThumbnailUpload}
        />
        {thumbnail && (
          <p className="text-xs text-green-600 mt-1">Thumbnail uploaded</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">File Produk *</label>
        <FileUploader
          type="product"
          accept=".pdf,.zip,.mp4,.xlsx,.docx,.epub"
          onUploadComplete={handleFileUpload}
        />
        {fileKey && (
          <p className="text-xs text-green-600 mt-1">
            File uploaded: {fileName}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Mengupload..." : "Upload Produk"}
      </Button>
    </form>
  )
}
