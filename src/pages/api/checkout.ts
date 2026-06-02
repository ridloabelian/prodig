import type { APIRoute } from "astro";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb } from "../../db";
import { products, transactions, affiliates } from "../../db/schema";
import { createMayarInvoice } from "../../lib/mayar";

export const prerender = false;

const checkoutSchema = z.object({
  productId: z.string(),
  affiliateCode: z.string().optional().nullable(),
});

export const POST: APIRoute = async (context) => {
  try {
    // 1. Authenticate user from locals
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Silakan masuk terlebih dahulu" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Parse request body
    const body = await context.request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Input tidak valid" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { productId, affiliateCode } = parsed.data;
    const db = getDb(context.locals.runtime.env);

    // 3. Find product
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .get();

    if (!product || product.status !== "APPROVED") {
      return new Response(
        JSON.stringify({ error: "Produk tidak tersedia untuk dibeli" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Check if already purchased and paid
    const existing = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.buyerId, user.id),
          eq(transactions.productId, productId),
          eq(transactions.status, "PAID")
        )
      )
      .get();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Anda sudah membeli produk ini sebelumnya" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Resolve Affiliate Commission
    let affiliateId: string | null = null;
    let affiliateCommission = 0;

    if (affiliateCode) {
      const affiliate = await db
        .select()
        .from(affiliates)
        .where(eq(affiliates.code, affiliateCode))
        .get();

      if (
        affiliate && 
        affiliate.status === "ACTIVE" && 
        affiliate.userId !== user.id
      ) {
        affiliateId = affiliate.id;
        affiliateCommission = Math.floor((product.price * affiliate.commissionPercent) / 100);
      }
    }

    // 6. Calculate Fees & Tax (PPN 11%)
    const platformFeePercent = parseInt(context.locals.runtime.env.PLATFORM_FEE_PERCENT || "10");
    const commission = Math.floor((product.price * platformFeePercent) / 100);
    const netAmount = product.price - commission - affiliateCommission;
    const ppn = Math.floor((product.price * 11) / 100);
    const totalAmount = product.price + ppn;

    // 7. Create Pending Transaction Record in D1
    const transactionId = crypto.randomUUID();
    const downloadToken = crypto.randomUUID();

    await db.insert(transactions).values({
      id: transactionId,
      buyerId: user.id,
      productId,
      subtotal: product.price,
      ppn,
      amount: totalAmount,
      commission,
      netAmount,
      affiliateId,
      affiliateCommission,
      status: "PENDING",
      downloadToken,
      downloadCount: 0,
    });

    // 8. Generate Mayar Invoice
    const appUrl = context.locals.runtime.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const mayarRes = await createMayarInvoice(context.locals.runtime.env, {
      amount: totalAmount,
      description: `Pembelian ${product.title} di Prodig.id`,
      customerName: user.name || "Customer",
      customerEmail: user.email,
      redirectUrl: `${appUrl}/checkout/success?trx_id=${transactionId}`,
      webhookUrl: `${appUrl}/api/webhooks/mayar`,
      externalId: transactionId,
    });

    const paymentId = mayarRes.data?.id || mayarRes.id;
    const invoiceUrl = mayarRes.data?.paymentUrl || mayarRes.paymentUrl;

    // 9. Update Transaction with Mayar Payment Info
    await db
      .update(transactions)
      .set({
        mayarPaymentId: paymentId,
        mayarInvoiceUrl: invoiceUrl,
      })
      .where(eq(transactions.id, transactionId));

    return new Response(
      JSON.stringify({
        invoiceUrl,
        transactionId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal melakukan checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Terjadi kesalahan server saat checkout" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
