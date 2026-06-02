import type { APIRoute } from "astro";
import { z } from "zod";
import { getPresignedUploadUrl, getPublicUrl } from "../../../lib/r2";

export const prerender = false;

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().positive(),
  type: z.enum(["product", "thumbnail"]),
});

const ALLOWED_PRODUCT_TYPES = [
  "application/pdf",
  "application/zip",
  "video/mp4",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/epub+zip",
];

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export const POST: APIRoute = async (context) => {
  try {
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await context.request.json();
    const parsed = uploadSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Input tidak valid" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { fileName, fileType, fileSize, type } = parsed.data;

    if (type === "product") {
      if (fileSize > 500 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Berkas produk terlalu besar. Maksimal 500MB" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (!ALLOWED_PRODUCT_TYPES.includes(fileType)) {
        return new Response(
          JSON.stringify({ error: "Jenis berkas produk tidak diizinkan. Hanya PDF, ZIP, MP4, Excel, Word, EPUB." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      if (fileSize > 2 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Thumbnail terlalu besar. Maksimal 2MB" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
        return new Response(
          JSON.stringify({ error: "Format gambar tidak didukung. Gunakan JPEG, PNG, JPG, atau WEBP." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const uuid = crypto.randomUUID();
    const key =
      type === "product"
        ? `products/${user.id}/${uuid}-${fileName}`
        : `thumbnails/${uuid}-${fileName}`;

    const uploadUrl = await getPresignedUploadUrl(context.locals.runtime.env, key, fileType);
    const publicUrl = getPublicUrl(context.locals.runtime.env, key);

    return new Response(
      JSON.stringify({ uploadUrl, fileKey: key, fileName, publicUrl }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Gagal membuat R2 presigned URL:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server saat menyiapkan upload" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
