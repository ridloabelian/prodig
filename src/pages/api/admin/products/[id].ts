import type { APIRoute } from "astro";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { products } from "../../../../db/schema";

export const prerender = false;

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const PATCH: APIRoute = async (context) => {
  try {
    // 1. Authenticate and authorize admin
    const user = context.locals.user;
    if (!user || user.role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Akses ditolak" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({ error: "ID produk dibutuhkan" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Parse status body
    const body = await context.request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Input status tidak valid" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { status } = parsed.data;
    const db = getDb(context.locals.runtime.env);

    // 3. Update status in D1
    await db
      .update(products)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    return new Response(
      JSON.stringify({ success: true, message: `Status produk berhasil diperbarui menjadi ${status}` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal memperbarui status produk oleh admin:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal pada server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
