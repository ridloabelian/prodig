import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { z } from "zod";
import { getDb } from "../../db";
import { products } from "../../db/schema";

export const prerender = false;

const createProductSchema = z.object({
  title: z.string().min(5, "Judul minimal 5 karakter").max(100, "Judul maksimal 100 karakter"),
  description: z.string().min(50, "Deskripsi minimal 50 karakter").max(5000, "Deskripsi maksimal 5000 karakter"),
  price: z.number().int().min(10000, "Harga minimal Rp 10.000").max(100000000, "Harga maksimal Rp 100.000.000"), // Max 100JT Rupiah
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  fileKey: z.string().min(1, "Berkas produk wajib diunggah"),
  fileName: z.string().min(1, "Nama berkas produk tidak boleh kosong"),
  fileSize: z.number().int().positive("Ukuran berkas tidak valid"),
  thumbnail: z.string().min(1, "Thumbnail produk wajib diunggah"),
});

export const POST: APIRoute = async (context) => {
  try {
    // 1. Verify seller role
    const user = context.locals.user;
    if (!user || (user.role !== "SELLER" && user.role !== "ADMIN")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Parse and validate JSON input
    const body = await context.request.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Input tidak valid";
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const db = getDb(env);
    const productId = crypto.randomUUID();

    // 3. Insert product
    await db.insert(products).values({
      id: productId,
      sellerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      price: parsed.data.price,
      categoryId: parsed.data.categoryId,
      fileKey: parsed.data.fileKey,
      fileName: parsed.data.fileName,
      fileSize: parsed.data.fileSize,
      thumbnail: parsed.data.thumbnail,
      status: "PENDING",
      salesCount: 0,
      viewCount: 0,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        product: { 
          id: productId, 
          title: parsed.data.title, 
          status: "PENDING" 
        } 
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Gagal membuat produk baru:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server saat menyimpan produk" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
