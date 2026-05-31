"use client"

import { useState, useCallback } from "react"
import { useToast } from "@/components/ui/toaster"

interface FileUploaderProps {
  type: "product" | "thumbnail"
  onUploadComplete: (fileKey: string, fileName: string, fileSize: number, publicUrl: string) => void
  accept?: string
}

export function FileUploader({ type, onUploadComplete, accept }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { addToast } = useToast()

  const uploadToR2 = (
    file: File,
    uploadUrl: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", uploadUrl, true)
      xhr.setRequestHeader("Content-Type", file.type)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100))
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve()
        } else {
          reject(new Error(`Upload failed: HTTP ${xhr.status} ${xhr.statusText}`))
        }
      }

      xhr.onerror = () => {
        reject(new Error("Upload failed: Network error. Check CORS settings in R2 bucket."))
      }

      xhr.ontimeout = () => {
        reject(new Error("Upload failed: Request timeout."))
      }

      xhr.send(file)
    })
  }

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      setProgress(0)

      try {
        // Get presigned URL
        const presignedRes = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            type,
          }),
        })

        if (!presignedRes.ok) {
          const err = await presignedRes.json().catch(() => ({}))
          throw new Error(err.error || `Failed to get upload URL: HTTP ${presignedRes.status}`)
        }

        const { uploadUrl, fileKey, publicUrl } = await presignedRes.json()

        // Upload directly to R2 using Promise-based XHR
        await uploadToR2(file, uploadUrl)

        onUploadComplete(fileKey, file.name, file.size, publicUrl)
        addToast({
          title: "Upload berhasil",
          description: file.name,
        })
      } catch (error: any) {
        console.error("Upload error:", error)
        addToast({
          title: "Upload gagal",
          description: error.message || "Terjadi kesalahan saat upload",
          variant: "destructive",
        })
      } finally {
        setUploading(false)
      }
    },
    [type, onUploadComplete, addToast]
  )

  return (
    <div className="space-y-2">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          uploading ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          type="file"
          onChange={handleFileChange}
          accept={accept}
          disabled={uploading}
          className="hidden"
          id={`file-upload-${type}`}
        />
        <label
          htmlFor={`file-upload-${type}`}
          className="cursor-pointer block"
        >
          {uploading ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">Mengupload... {progress}%</div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-sm font-medium">
                {type === "product"
                  ? "Drag & drop file atau klik untuk upload"
                  : "Upload thumbnail"}
              </div>
              <div className="text-xs text-muted-foreground">
                {type === "product"
                  ? "PDF, ZIP, MP4, Excel, Word. Max 500MB"
                  : "JPEG, PNG, WebP. Max 2MB"}
              </div>
            </div>
          )}
        </label>
      </div>
    </div>
  )
}
