import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { affiliateWithdrawals, affiliates, users } from "../../../db/schema";

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

    // Fetch all affiliate withdrawal requests with affiliate code and user details
    const results = await db
      .select({
        id: affiliateWithdrawals.id,
        amount: affiliateWithdrawals.amount,
        status: affiliateWithdrawals.status,
        createdAt: affiliateWithdrawals.createdAt,
        affiliate: {
          id: affiliates.id,
          code: affiliates.code,
        },
        user: {
          name: users.name,
          email: users.email,
          bankName: users.bankName,
          bankAccount: users.bankAccount,
        },
      })
      .from(affiliateWithdrawals)
      .leftJoin(affiliates, eq(affiliateWithdrawals.affiliateId, affiliates.id))
      .leftJoin(users, eq(affiliates.userId, users.id))
      .orderBy(desc(affiliateWithdrawals.createdAt));

    return new Response(
      JSON.stringify({ withdrawals: results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal memuat daftar penarikan komisi affiliate:", error);
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
        JSON.stringify({ error: "ID penarikan komisi dibutuhkan" }),
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

    // Update status in affiliateWithdrawals table
    await db
      .update(affiliateWithdrawals)
      .set({
        status,
        notes: notes || null,
        processedAt: status === "PROCESSED" || status === "REJECTED" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(affiliateWithdrawals.id, id));

    return new Response(
      JSON.stringify({ success: true, message: `Permintaan penarikan komisi affiliate berhasil diperbarui menjadi ${status}` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal memperbarui status penarikan komisi affiliate oleh admin:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal pada server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
