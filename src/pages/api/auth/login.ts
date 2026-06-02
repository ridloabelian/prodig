export const prerender = false;
import type { APIRoute } from "astro";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schema";
import { comparePassword, createSession } from "../../../lib/auth";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password tidak boleh kosong"),
});

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Data tidak valid";
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email, password } = parsed.data;
    const db = getDb(context.locals.runtime.env);

    // Find user in D1
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .get();

    if (!user || !user.password) {
      return new Response(
        JSON.stringify({ error: "Email atau password salah" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Email atau password salah" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create session
    const session = await createSession(db, user.id);

    // Save session in cookie (httpOnly, secure)
    context.cookies.set("session_token", session.sessionToken, {
      path: "/",
      expires: session.expiresAt,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
