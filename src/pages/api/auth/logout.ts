export const prerender = false;
import type { APIRoute } from "astro";
import { getDb } from "../../../db";
import { invalidateSession } from "../../../lib/auth";

export const POST: APIRoute = async (context) => {
  const sessionToken = context.cookies.get("session_token")?.value;
  
  if (sessionToken) {
    try {
      const db = getDb(context.locals.runtime.env);
      await invalidateSession(db, sessionToken);
    } catch (error) {
      console.error("Gagal menghapus sesi saat logout:", error);
    }
    
    // Delete session token cookie
    context.cookies.delete("session_token", { path: "/" });
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
