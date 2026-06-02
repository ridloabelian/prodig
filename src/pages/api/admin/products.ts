import type { APIRoute } from "astro";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { products, users, categories } from "../../../db/schema";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // 1. Authenticate and authorize admin
    const user = context.locals.user;
    if (!user || user.role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Akses ditolak: Hanya untuk Administrator" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch parameters
    const { searchParams } = new URL(context.request.url);
    const status = searchParams.get("status") || "PENDING";
    const db = getDb(context.locals.runtime.env);

    // 3. Query products with joins
    let baseQuery = db
      .select({
        id: products.id,
        title: products.title,
        price: products.price,
        status: products.status,
        createdAt: products.createdAt,
        seller: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        category: {
          name: categories.name,
        },
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id));

    let results;
    if (status === "ALL") {
      results = await baseQuery.orderBy(desc(products.createdAt));
    } else {
      results = await baseQuery
        .where(eq(products.status, status as any))
        .orderBy(desc(products.createdAt));
    }

    return new Response(
      JSON.stringify({ products: results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal mengambil produk moderasi admin:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal pada server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
