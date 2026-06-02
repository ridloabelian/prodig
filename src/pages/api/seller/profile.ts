import type { APIRoute } from "astro";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schema";

export const prerender = false;

const profileSchema = z.object({
  bankName: z.string().min(2).max(100),
  bankAccount: z.string().min(5).max(50),
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
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Input tidak valid", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { bankName, bankAccount } = parsed.data;
    const db = getDb(context.locals.runtime.env);

    await db
      .update(users)
      .set({
        bankName,
        bankAccount,
      })
      .where(eq(users.id, user.id));

    return new Response(
      JSON.stringify({ success: true, message: "Informasi rekening bank berhasil diperbarui" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gagal memperbarui profil bank seller:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal pada server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
