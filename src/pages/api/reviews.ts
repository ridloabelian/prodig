import type { APIRoute } from "astro";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { transactions, reviews } from "../../db/schema";

export const prerender = false;

const reviewSchema = z.object({
  transactionId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(1000).optional().nullable(),
});

export const POST: APIRoute = async (context) => {
  try {
    // 1. Authenticate user
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Silakan masuk terlebih dahulu untuk memberikan ulasan" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Parse request body
    const body = await context.request.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Input tidak valid", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { transactionId, rating, comment } = parsed.data;
    const db = getDb(context.locals.runtime.env);

    // 3. Find transaction
    const transaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .get();

    if (!transaction) {
      return new Response(
        JSON.stringify({ error: "Transaksi tidak ditemukan" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Access validations
    if (transaction.buyerId !== user.id) {
      return new Response(
        JSON.stringify({ error: "Akses ditolak. Anda bukan pembeli untuk transaksi ini." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    if (transaction.status !== "PAID") {
      return new Response(
        JSON.stringify({ error: "Ulasan hanya dapat diberikan untuk transaksi yang sudah dibayar" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Check if already reviewed
    const existingReview = await db
      .select()
      .from(reviews)
      .where(eq(reviews.transactionId, transactionId))
      .get();

    if (existingReview) {
      return new Response(
        JSON.stringify({ error: "Anda sudah memberikan ulasan untuk transaksi ini" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Enforce 1-hour cooldown after purchase
    const cooldownTime = new Date(new Date(transaction.createdAt).getTime() + 60 * 60 * 1000);
    if (new Date() < cooldownTime) {
      const minutesLeft = Math.ceil((cooldownTime.getTime() - Date.now()) / 60000);
      return new Response(
        JSON.stringify({
          error: `Harap tunggu ${minutesLeft} menit lagi sebelum dapat memberikan ulasan untuk produk ini.`,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // 7. Insert review
    const reviewId = crypto.randomUUID();
    await db.insert(reviews).values({
      id: reviewId,
      transactionId,
      productId: transaction.productId,
      buyerId: user.id,
      rating,
      comment: comment || null,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Ulasan berhasil dikirim" }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal mengirim ulasan:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal pada server saat mengirim ulasan" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
