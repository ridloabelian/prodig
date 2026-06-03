import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { z } from "zod";
import { getDb } from "../../db";
import { products, landingPages } from "../../db/schema";
import { eq, and, ne } from "drizzle-orm";

export const prerender = false;

const saveLandingPageSchema = z.object({
  productId: z.string().min(1, "Product ID wajib diisi"),
  slug: z.string()
    .min(3, "Slug minimal 3 karakter")
    .max(50, "Slug maksimal 50 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)"),
  title: z.string().min(3, "Judul SEO minimal 3 karakter").max(100, "Judul SEO maksimal 100 karakter"),
  subtitle: z.string().max(200, "Subjudul maksimal 200 karakter").optional().nullable(),
  theme: z.enum(["midnight", "emerald", "ocean", "sunset"]).default("midnight"),
  prompt: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  
  // Section data
  heroTitle: z.string().min(5, "Judul Hero minimal 5 karakter").max(150, "Judul Hero maksimal 150 karakter"),
  heroSubtitle: z.string().min(10, "Subjudul Hero minimal 10 karakter").max(300, "Subjudul Hero maksimal 300 karakter"),
  heroFeatures: z.array(z.string()).optional().default([]),
  
  features: z.array(z.object({
    title: z.string().min(1, "Judul keunggulan wajib diisi"),
    description: z.string().min(1, "Penjelasan keunggulan wajib diisi"),
    icon: z.string().default("zap")
  })).min(1, "Minimal harus ada 1 keunggulan"),
  
  testimonials: z.array(z.object({
    name: z.string().min(1, "Nama testi wajib diisi"),
    role: z.string().optional().default("Customer"),
    content: z.string().min(1, "Isi testimoni wajib diisi"),
    rating: z.number().int().min(1).max(5).default(5)
  })).optional().default([]),
  
  faqs: z.array(z.object({
    question: z.string().min(1, "Pertanyaan wajib diisi"),
    answer: z.string().min(1, "Jawaban wajib diisi")
  })).optional().default([]),
});

// POST: Create or Update Landing Page
export const POST: APIRoute = async (context) => {
  try {
    const user = context.locals.user;
    if (!user || (user.role !== "SELLER" && user.role !== "ADMIN")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await context.request.json();
    const parsed = saveLandingPageSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Input tidak valid";
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const db = getDb(env);
    const data = parsed.data;

    // 1. Verify product ownership
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, data.productId))
      .get();

    if (!product || (product.sellerId !== user.id && user.role !== "ADMIN")) {
      return new Response(
        JSON.stringify({ error: "Produk tidak ditemukan atau bukan milik Anda" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Check if slug is unique (excluding this landing page if it exists)
    const existingSlug = await db
      .select()
      .from(landingPages)
      .where(and(eq(landingPages.slug, data.slug), ne(landingPages.productId, data.productId)))
      .get();

    if (existingSlug) {
      return new Response(
        JSON.stringify({ error: "Slug sudah digunakan oleh landing page lain" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if landing page already exists for this product
    const existingLp = await db
      .select()
      .from(landingPages)
      .where(eq(landingPages.productId, data.productId))
      .get();

    const now = new Date();

    if (existingLp) {
      // Update
      await db
        .update(landingPages)
        .set({
          slug: data.slug,
          title: data.title,
          subtitle: data.subtitle,
          theme: data.theme,
          prompt: data.prompt,
          status: data.status,
          heroTitle: data.heroTitle,
          heroSubtitle: data.heroSubtitle,
          heroFeatures: JSON.stringify(data.heroFeatures),
          features: JSON.stringify(data.features),
          testimonials: JSON.stringify(data.testimonials),
          faqs: JSON.stringify(data.faqs),
          updatedAt: now,
        })
        .where(eq(landingPages.productId, data.productId));

      return new Response(
        JSON.stringify({ success: true, message: "Landing page berhasil diperbarui", slug: data.slug }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      // Create new
      const lpId = crypto.randomUUID();
      await db.insert(landingPages).values({
        id: lpId,
        productId: data.productId,
        sellerId: user.id,
        slug: data.slug,
        title: data.title,
        subtitle: data.subtitle,
        theme: data.theme,
        prompt: data.prompt,
        status: data.status,
        heroTitle: data.heroTitle,
        heroSubtitle: data.heroSubtitle,
        heroFeatures: JSON.stringify(data.heroFeatures),
        features: JSON.stringify(data.features),
        testimonials: JSON.stringify(data.testimonials),
        faqs: JSON.stringify(data.faqs),
        createdAt: now,
        updatedAt: now,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Landing page berhasil dibuat", slug: data.slug }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Gagal menyimpan landing page:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server saat menyimpan" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// DELETE: Delete Landing Page
export const DELETE: APIRoute = async (context) => {
  try {
    const user = context.locals.user;
    if (!user || (user.role !== "SELLER" && user.role !== "ADMIN")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(context.request.url);
    const productId = url.searchParams.get("productId");

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID wajib dicantumkan" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const db = getDb(env);

    // Verify ownership
    const lp = await db
      .select()
      .from(landingPages)
      .where(eq(landingPages.productId, productId))
      .get();

    if (!lp) {
      return new Response(
        JSON.stringify({ error: "Landing page tidak ditemukan" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (lp.sellerId !== user.id && user.role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    await db.delete(landingPages).where(eq(landingPages.productId, productId));

    return new Response(
      JSON.stringify({ success: true, message: "Landing page berhasil dihapus" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal menghapus landing page:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server saat menghapus" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
