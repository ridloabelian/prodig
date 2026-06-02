import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { withdrawals, users } from "../../../db/schema";

export const prerender = false;

const patchSchema = z.object({
  status: z.enum(["PROCESSED", "REJECTED"]),
  notes: z.string().optional(),
});

export const GET: APIRoute = async (context) => {
  try {
    const user = context.locals.user;
    if (!user || user.role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const db = getDb(env);

    // Fetch all PENDING withdrawal requests for sellers
    const results = await db
      .select({
        id: withdrawals.id,
        amount: withdrawals.amount,
        status: withdrawals.status,
        createdAt: withdrawals.createdAt,
        seller: {
          id: users.id,
          name: users.name,
          email: users.email,
          bankName: users.bankName,
          bankAccount: users.bankAccount,
        },
      })
      .from(withdrawals)
      .leftJoin(users, eq(withdrawals.sellerId, users.id))
      .where(eq(withdrawals.status, "PENDING"))
      .orderBy(desc(withdrawals.createdAt));

    return new Response(
      JSON.stringify({ withdrawals: results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal memuat daftar penarikan admin:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal pada server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PATCH: APIRoute = async (context) => {
  try {
    const user = context.locals.user;
    if (!user || user.role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { searchParams } = new URL(context.request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response(
        JSON.stringify({ error: "ID penarikan dibutuhkan" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await context.request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Input status tidak valid" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { status, notes } = parsed.data;
    const db = getDb(env);

    // Update withdrawal request status
    await db
      .update(withdrawals)
      .set({
        status,
        notes: notes || null,
        processedAt: status === "PROCESSED" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(withdrawals.id, id));

    return new Response(
      JSON.stringify({ success: true, message: `Permintaan penarikan berhasil diperbarui menjadi ${status}` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal memperbarui status penarikan seller oleh admin:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal pada server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
