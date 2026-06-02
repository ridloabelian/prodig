import type { APIRoute } from "astro";
import { eq, and, gte, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { transactions, products, downloadLogs } from "../../db/schema";
import { getPresignedDownloadUrl } from "../../lib/r2";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const env = context.locals.runtime.env;
  const db = getDb(env);

  try {
    const { searchParams } = new URL(context.request.url);
    const token = searchParams.get("token");
    const trxId = searchParams.get("trx_id");

    let transaction: any = null;

    if (token) {
      // 1. Verify download by downloadToken query parameter (e.g. from email/WhatsApp links)
      const result = await db
        .select({
          transaction: transactions,
          product: products,
        })
        .from(transactions)
        .where(eq(transactions.downloadToken, token))
        .leftJoin(products, eq(transactions.productId, products.id))
        .get();

      if (!result || !result.transaction) {
        return new Response(
          JSON.stringify({ error: "Token unduhan tidak valid atau kedaluwarsa" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      transaction = {
        ...result.transaction,
        product: result.product,
      };

      if (transaction.status !== "PAID") {
        return new Response(
          JSON.stringify({ error: "Transaksi belum dibayar" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Check token expiration
      if (transaction.tokenExpiresAt && new Date(transaction.tokenExpiresAt) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Token unduhan telah kedaluwarsa. Silakan unduh melalui Library." }),
          { status: 410, headers: { "Content-Type": "application/json" } }
        );
      }
    } else if (trxId) {
      // 2. Verify download by transaction ID (usually from the /library page where the user is logged in)
      const user = context.locals.user;
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Silakan masuk terlebih dahulu untuk mengunduh berkas" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await db
        .select({
          transaction: transactions,
          product: products,
        })
        .from(transactions)
        .where(eq(transactions.id, trxId))
        .leftJoin(products, eq(transactions.productId, products.id))
        .get();

      if (!result || !result.transaction) {
        return new Response(
          JSON.stringify({ error: "Transaksi tidak ditemukan" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      transaction = {
        ...result.transaction,
        product: result.product,
      };

      if (transaction.buyerId !== user.id) {
        return new Response(
          JSON.stringify({ error: "Anda tidak berhak mengakses unduhan ini" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      if (transaction.status !== "PAID") {
        return new Response(
          JSON.stringify({ error: "Transaksi belum dibayar" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Query parameter 'token' atau 'trx_id' dibutuhkan" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Rate Limit Check: 3 downloads per 24 hours per transaction
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(downloadLogs)
      .where(
        and(
          eq(downloadLogs.transactionId, transaction.id),
          gte(downloadLogs.createdAt, twentyFourHoursAgo)
        )
      )
      .get();

    const recentDownloadCount = countRes?.count || 0;

    if (recentDownloadCount >= 3) {
      return new Response(
        JSON.stringify({
          error: "Batas unduhan harian (3x dalam 24 jam) tercapai. Silakan coba lagi nanti atau hubungi bantuan support.",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Generate Presigned R2 Download URL (use watermarked PDF if available, otherwise original)
    const fileKey = transaction.watermarkedFileKey || transaction.product?.fileKey;
    if (!fileKey) {
      return new Response(
        JSON.stringify({ error: "Berkas produk tidak ditemukan" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const downloadUrl = await getPresignedDownloadUrl(env, fileKey, 300);

    // 5. Create a Download Log and Update Download Counts in D1
    const logId = crypto.randomUUID();
    const ipAddress = context.request.headers.get("cf-connecting-ip") || context.request.headers.get("x-real-ip");
    const userAgent = context.request.headers.get("user-agent");

    await db.insert(downloadLogs).values({
      id: logId,
      transactionId: transaction.id,
      userId: transaction.buyerId,
      ipAddress,
      userAgent,
    });

    await db
      .update(transactions)
      .set({
        downloadCount: sql`${transactions.downloadCount} + 1`,
        lastDownloadAt: new Date(),
      })
      .where(eq(transactions.id, transaction.id));

    // 6. Redirect the client to the direct S3/R2 presigned link
    return context.redirect(downloadUrl, 302);
  } catch (error: any) {
    console.error("Gagal melakukan unduhan:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal pada server saat memproses unduhan" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
