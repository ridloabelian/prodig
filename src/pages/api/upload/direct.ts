import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { getPublicUrl } from "../../../lib/r2";

export const prerender = false;

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
    // 1. Verify authenticated user (seller or admin)
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Parse Multipart Form Data
    const formData = await context.request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file || !type) {
      return new Response(
        JSON.stringify({ error: "Berkas dan tipe unggahan wajib dikirim." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;

    // 3. Validate File Types and Size Limits
    if (type === "product") {
      if (fileSize > 500 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Berkas produk terlalu besar. Maksimal 500MB." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (!ALLOWED_PRODUCT_TYPES.includes(fileType)) {
        return new Response(
          JSON.stringify({ error: "Jenis berkas produk tidak diizinkan. Hanya PDF, ZIP, MP4, Excel, Word, EPUB." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } else if (type === "thumbnail") {
      if (fileSize > 2 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Thumbnail terlalu besar. Maksimal 2MB." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
        return new Response(
          JSON.stringify({ error: "Format gambar tidak didukung. Gunakan JPEG, PNG, JPG, atau WEBP." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Tipe unggahan tidak valid." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Generate R2 key
    const uuid = crypto.randomUUID();
    const key = type === "product"
      ? `products/${user.id}/${uuid}-${fileName}`
      : `thumbnails/${uuid}-${fileName}`;

    // 5. Save to Cloudflare R2 using bindings directly (bypassing S3 endpoint client/CORS)
    if (type === "product") {
      if (!env.R2_FILES) {
        throw new Error("R2 binding 'R2_FILES' tidak terkonfigurasi pada Cloudflare.");
      }
      await env.R2_FILES.put(key, file.stream(), {
        httpMetadata: { contentType: fileType }
      });
    } else {
      if (!env.R2_PUBLIC) {
        throw new Error("R2 binding 'R2_PUBLIC' tidak terkonfigurasi pada Cloudflare.");
      }
      await env.R2_PUBLIC.put(key, file.stream(), {
        httpMetadata: { contentType: fileType }
      });
    }

    const publicUrl = getPublicUrl(env, key);

    return new Response(
      JSON.stringify({ fileKey: key, fileName, publicUrl }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal mengunggah berkas secara langsung:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Terjadi kesalahan server saat mengunggah berkas." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
