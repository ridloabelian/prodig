import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../../db";
import { transactions, products, users } from "../../db/schema";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { searchParams } = new URL(context.request.url);
    const trxId = searchParams.get("trx_id");
    const db = getDb(env);

    if (trxId) {
      // 1. Fetch single transaction by ID
      const tx = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, trxId))
        .get();

      return new Response(
        JSON.stringify({ transaction: tx }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch all PAID transactions for logged-in buyer
    const txsList = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        createdAt: transactions.createdAt,
        status: transactions.status,
        product: {
          id: products.id,
          title: products.title,
          thumbnail: products.thumbnail,
          fileName: products.fileName,
          sellerName: users.name,
        },
      })
      .from(transactions)
      .leftJoin(products, eq(transactions.productId, products.id))
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(
        and(
          eq(transactions.buyerId, user.id),
          eq(transactions.status, "PAID")
        )
      )
      .orderBy(desc(transactions.createdAt));

    return new Response(
      JSON.stringify({ transactions: txsList }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Library API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
