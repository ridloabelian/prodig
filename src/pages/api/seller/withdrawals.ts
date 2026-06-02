import type { APIRoute } from "astro";
import { z } from "zod";
import { eq, and, sum } from "drizzle-orm";
import { getDb } from "../../../db";
import { users, transactions, products, withdrawals } from "../../../db/schema";

export const prerender = false;

const withdrawalSchema = z.object({
  amount: z.number().int().min(50000, "Minimum penarikan adalah Rp 50.000"),
});

export const POST: APIRoute = async (context) => {
  try {
    const user = context.locals.user;
    if (!user || (user.role !== "SELLER" && user.role !== "ADMIN")) {
      return new Response(
        JSON.stringify({ error: "Akses ditolak" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await context.request.json();
    const parsed = withdrawalSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Input tidak valid", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { amount } = parsed.data;
    const db = getDb(context.locals.runtime.env);

    // Fetch user details to verify bank details exist
    const sellerDetails = await db
      .select({
        bankAccount: users.bankAccount,
        bankName: users.bankName,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .get();

    if (!sellerDetails || !sellerDetails.bankAccount || !sellerDetails.bankName) {
      return new Response(
        JSON.stringify({ error: "Lengkapi informasi rekening bank Anda di profil sebelum melakukan penarikan" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calculate total net earnings from paid transactions of seller's products
    const revenueRes = await db
      .select({ sum: sum(transactions.netAmount) })
      .from(transactions)
      .leftJoin(products, eq(transactions.productId, products.id))
      .where(
        and(
          eq(products.sellerId, user.id),
          eq(transactions.status, "PAID")
        )
      )
      .get();
    const totalRevenue = Number(revenueRes?.sum || 0);

    // Calculate processed withdrawals
    const processedRes = await db
      .select({ sum: sum(withdrawals.amount) })
      .from(withdrawals)
      .where(
        and(
          eq(withdrawals.sellerId, user.id),
          eq(withdrawals.status, "PROCESSED")
        )
      )
      .get();
    const totalProcessed = Number(processedRes?.sum || 0);

    const availableBalance = totalRevenue - totalProcessed;

    if (amount > availableBalance) {
      return new Response(
        JSON.stringify({ error: "Saldo tidak mencukupi untuk melakukan penarikan" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert pending withdrawal request
    const withdrawalId = crypto.randomUUID();
    await db.insert(withdrawals).values({
      id: withdrawalId,
      sellerId: user.id,
      amount,
      status: "PENDING",
    });

    return new Response(
      JSON.stringify({ success: true, message: "Permintaan penarikan dana berhasil dibuat" }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal memproses penarikan dana:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal pada server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
