import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { transactions } from "../../../db/schema";

export const prerender = false;

/**
 * Webhook handler khusus untuk CuanBlueprint
 * Dipanggil oleh CuanBlueprint Workers setelah payment sukses
 * 
 * Flow:
 * 1. Mayar webhook → prodig webhook handler (update transaction status)
 * 2. prodig webhook handler → call CuanBlueprint webhook (generate mentor token)
 * 3. CuanBlueprint webhook → return mentor_url + token
 * 4. prodig include mentor_url di email download
 * 
 * Endpoint: POST /api/webhooks/cuanblueprint
 */

export const POST: APIRoute = async (context) => {
  try {
    const db = getDb(env);
    const payload = await context.request.json();

    // Verify webhook signature dari CuanBlueprint
    const signature = context.request.headers.get("x-cuanblueprint-signature");
    const expectedSecret = env.CUANBLUEPRINT_WEBHOOK_SECRET;

    if (!signature || signature !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (payload.event !== "mentor.activated") {
      return new Response(
        JSON.stringify({ ok: true, message: "Event ignored" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const { transaction_id, mentor_url } = payload.data;

    // Update transaction dengan mentor access info
    // Simpan mentor_url di notes field untuk sekarang
    await db
      .update(transactions)
      .set({
        // @ts-ignore - notes field bisa dipakai untuk metadata
        notes: JSON.stringify({ mentorUrl: mentor_url, activatedAt: new Date().toISOString() })
      })
      .where(eq(transactions.id, transaction_id));

    console.log(`Mentor access generated for transaction ${transaction_id}: ${mentor_url}`);

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("CuanBlueprint webhook error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};
