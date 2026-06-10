import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { products, categories } from "../../../db/schema";

export const prerender = false;

/**
 * Setup endpoint untuk produk CuanBlueprint
 * Dipanggil sekali untuk create/update produk di prodig
 * 
 * Usage: POST /api/products/cuanblueprint-setup
 * Body: { sellerId: "..." }
 */

export const POST: APIRoute = async (context) => {
  try {
    const db = getDb(env);
    const body = await context.request.json();
    const { sellerId } = body;

    if (!sellerId) {
      return new Response(
        JSON.stringify({ error: "sellerId diperlukan" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Cek atau buat kategori Digital Marketing
    let category = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, "digital-marketing"))
      .get();

    if (!category) {
      const categoryId = crypto.randomUUID();
      await db.insert(categories).values({
        id: categoryId,
        name: "Digital Marketing",
        slug: "digital-marketing",
        description: "Ebook, course, dan tools untuk digital marketing",
      });
      category = { id: categoryId, name: "Digital Marketing", slug: "digital-marketing", description: "Ebook, course, dan tools untuk digital marketing" };
    }

    // Cek apakah produk sudah ada
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.title, "CuanBlueprint"))
      .get();

    const productData = {
      sellerId,
      title: "CuanBlueprint",
      description: "Panduan lengkap scale bisnis digital dengan Meta Ads. Ebook 5 bab + AI Mentor Mas Bluprint.",
      price: 197000, // Rp 197.000
      categoryId: category.id,
      fileKey: "cuanblueprint/ebook.pdf", // Upload ke R2
      fileName: "CuanBlueprint-Ebook.pdf",
      thumbnail: "https://cuanblueprint.pages.dev/assets/cover.png", // Cover ebook
      status: "APPROVED" as const,
    };

    if (existingProduct) {
      // Update existing
      await db
        .update(products)
        .set(productData)
        .where(eq(products.id, existingProduct.id));

      return new Response(
        JSON.stringify({
          ok: true,
          message: "Produk CuanBlueprint diupdate",
          productId: existingProduct.id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      // Create new
      const productId = crypto.randomUUID();
      await db.insert(products).values({
        id: productId,
        ...productData,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          message: "Produk CuanBlueprint dibuat",
          productId,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("Gagal setup produk CuanBlueprint:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Terjadi kesalahan" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
