import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getPresignedUploadUrl } from "@/lib/r2"
import { z } from "zod"
import { randomUUID } from "crypto"

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().positive(),
  type: z.enum(["product", "thumbnail"]),
})

const ALLOWED_PRODUCT_TYPES = [
  "application/pdf",
  "application/zip",
  "video/mp4",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/epub+zip",
]

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = uploadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { fileName, fileType, fileSize, type } = parsed.data

    if (type === "product") {
      if (fileSize > 500 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File too large. Max 500MB" },
          { status: 400 }
        )
      }
      if (!ALLOWED_PRODUCT_TYPES.includes(fileType)) {
        return NextResponse.json(
          { error: "Invalid file type" },
          { status: 400 }
        )
      }
    } else {
      if (fileSize > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Thumbnail too large. Max 2MB" },
          { status: 400 }
        )
      }
      if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
        return NextResponse.json(
          { error: "Invalid image type" },
          { status: 400 }
        )
      }
    }

    const uuid = randomUUID()
    const key =
      type === "product"
        ? `products/${session.user.id}/${uuid}-${fileName}`
        : `thumbnails/${uuid}-${fileName}`

    const uploadUrl = await getPresignedUploadUrl(key, fileType)

    return NextResponse.json({ uploadUrl, fileKey: key, fileName })
  } catch (error) {
    console.error("Presigned upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
