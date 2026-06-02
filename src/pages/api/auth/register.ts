import { env } from "cloudflare:workers";
export const prerender = false;
import type { APIRoute } from "astro";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schema";
import { hashPassword } from "../../../lib/auth";

const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["BUYER", "SELLER"]),
  whatsapp: z.string().optional().nullable(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Data tidak valid";
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { name, email, password, role, whatsapp } = parsed.data;
    const db = getDb(env);

    // Check if email already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .get();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Email sudah terdaftar" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      whatsapp: whatsapp || null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          name,
          email,
          role,
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Registrasi error:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
