import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { eq, and, sql, aliasedTable } from "drizzle-orm";
import { getDb } from "../../../db";
import { webhookLogs, transactions, users, products, affiliates } from "../../../db/schema";
import { isPdfFile, watermarkPdf } from "../../../lib/watermark";
import { sendPurchaseSuccessEmail } from "../../../lib/email";
import {
  notifyBuyerPaymentSuccess,
  notifySellerNewSale,
  notifyAffiliateConversion,
} from "../../../lib/conviq";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const env = env;
  const db = getDb(env);

  try {
    const payload = await context.request.json();

    const paymentId = payload.paymentId || payload.id || payload.data?.id;
    const status = payload.status || payload.data?.status;

    // Log the webhook first
    const logId = crypto.randomUUID();
    await db.insert(webhookLogs).values({
      id: logId,
      provider: "mayar",
      eventId: paymentId || null,
      payload: JSON.stringify(payload),
      processed: false,
    });

    if (!paymentId) {
      return new Response(JSON.stringify({ ok: true, message: "No paymentId found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Idempotency check: see if there's already a processed webhook log for this paymentId
    const existingLog = await db
      .select()
      .from(webhookLogs)
      .where(
        and(
          eq(webhookLogs.provider, "mayar"),
          eq(webhookLogs.eventId, paymentId),
          eq(webhookLogs.processed, true)
        )
      )
      .get();

    if (existingLog) {
      return new Response(JSON.stringify({ ok: true, message: "Webhook already processed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Define aliases for users table to join multiple roles cleanly
    const buyers = aliasedTable(users, "buyers");
    const sellers = aliasedTable(users, "sellers");
    const affiliateUsers = aliasedTable(users, "affiliate_users");

    // Retrieve transaction and associated buyer, seller, product, and affiliate info
    const result = await db
      .select({
        transaction: transactions,
        buyer: buyers,
        product: products,
        seller: sellers,
        affiliate: affiliates,
        affiliateUser: affiliateUsers,
      })
      .from(transactions)
      .where(eq(transactions.mayarPaymentId, paymentId))
      .leftJoin(buyers, eq(transactions.buyerId, buyers.id))
      .leftJoin(products, eq(transactions.productId, products.id))
      .leftJoin(sellers, eq(products.sellerId, sellers.id))
      .leftJoin(affiliates, eq(transactions.affiliateId, affiliates.id))
      .leftJoin(affiliateUsers, eq(affiliates.userId, affiliateUsers.id))
      .get();

    if (!result || !result.transaction) {
      console.error(`Transaction not found for payment ID: ${paymentId}`);
      return new Response(JSON.stringify({ ok: true, message: "Transaction not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { transaction, buyer, product, seller, affiliate, affiliateUser } = result;

    if (status === "PAID" || status === "SETTLED") {
      // 1. Update database records in a D1 transaction block
      await db.transaction(async (tx) => {
        // Set transaction status to PAID and set download link expiration (24 hours from now)
        await tx
          .update(transactions)
          .set({
            status: "PAID",
            tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          })
          .where(eq(transactions.id, transaction.id));

        // Increment product sales count
        await tx
          .update(products)
          .set({
            salesCount: sql`${products.salesCount} + 1`,
          })
          .where(eq(products.id, transaction.productId));

        // Update affiliate balance & referrals if referenced
        if (transaction.affiliateId && transaction.affiliateCommission > 0) {
          await tx
            .update(affiliates)
            .set({
              totalEarnings: sql`${affiliates.totalEarnings} + ${transaction.affiliateCommission}`,
              totalReferrals: sql`${affiliates.totalReferrals} + 1`,
            })
            .where(eq(affiliates.id, transaction.affiliateId));
        }
      });

      // 2. Perform PDF watermarking asynchronously (if the product is a PDF)
      let watermarkedFileKey: string | undefined;
      try {
        if (product && isPdfFile(product.fileKey)) {
          const wKey = `watermarked/${transaction.id}/${product.fileKey}`;
          await watermarkPdf(env, product.fileKey, wKey, {
            buyerEmail: buyer?.email || "",
            transactionId: transaction.id,
          });
          watermarkedFileKey = wKey;

          // Save the watermarked key back to the transaction
          await db
            .update(transactions)
            .set({ watermarkedFileKey: wKey })
            .where(eq(transactions.id, transaction.id));
        }
      } catch (wmError) {
        console.error("PDF Watermarking failed (falling back to original):", wmError);
      }

      // 3. Dispatch purchase success email using Resend
      const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const downloadUrl = `${appUrl}/download?token=${transaction.downloadToken}`;

      if (buyer) {
        await sendPurchaseSuccessEmail(env, buyer.email, {
          productTitle: product?.title || "Produk Digital",
          productPrice: transaction.subtotal,
          downloadUrl,
          libraryUrl: `${appUrl}/library`,
        });
      }

      // 4. Dispatch WhatsApp notifications (non-blocking)
      try {
        const waPromises: Promise<any>[] = [];

        if (buyer && buyer.whatsapp) {
          waPromises.push(
            notifyBuyerPaymentSuccess(
              env,
              buyer.whatsapp,
              buyer.name || "Pembeli",
              product?.title || "Produk Digital",
              downloadUrl
            )
          );
        }

        if (seller && seller.whatsapp) {
          waPromises.push(
            notifySellerNewSale(
              env,
              seller.whatsapp,
              seller.name || "Penjual",
              product?.title || "Produk Digital",
              buyer?.name || "Pembeli",
              transaction.amount
            )
          );
        }

        if (affiliate && affiliateUser && affiliateUser.whatsapp) {
          waPromises.push(
            notifyAffiliateConversion(
              env,
              affiliateUser.whatsapp,
              affiliateUser.name || "Affiliate",
              product?.title || "Produk Digital",
              transaction.affiliateCommission
            )
          );
        }

        await Promise.all(waPromises);
      } catch (waError) {
        console.error("WhatsApp delivery failed (non-blocking):", waError);
      }
    } else if (status === "EXPIRED") {
      await db
        .update(transactions)
        .set({ status: "EXPIRED" })
        .where(eq(transactions.id, transaction.id));
    } else if (status === "FAILED") {
      await db
        .update(transactions)
        .set({ status: "FAILED" })
        .where(eq(transactions.id, transaction.id));
    }

    // Mark current webhook logs as processed
    await db
      .update(webhookLogs)
      .set({ processed: true })
      .where(and(eq(webhookLogs.provider, "mayar"), eq(webhookLogs.eventId, paymentId)));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Fatal webhook handler error:", error);
    // Return 200 to prevent Mayar from continuously retrying and spamming requests
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
