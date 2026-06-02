import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { sessions, users } from "../db/schema";
import type { DbType } from "../db";

// Session lifespan: 30 days
const SESSION_LIFESPAN_MS = 30 * 24 * 60 * 60 * 1000;
// Extend session when less than 15 days left
const SESSION_RENEWAL_MS = 15 * 24 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(db: DbType, userId: string) {
  const sessionToken = crypto.randomUUID();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_LIFESPAN_MS);

  const session = {
    id,
    sessionToken,
    userId,
    expiresAt,
  };

  await db.insert(sessions).values(session);

  return session;
}

export async function validateSessionToken(db: DbType, sessionToken: string) {
  // Query session joined with user details
  const result = await db
    .select({
      session: {
        id: sessions.id,
        sessionToken: sessions.sessionToken,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
      },
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        image: users.image,
        whatsapp: users.whatsapp,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.sessionToken, sessionToken))
    .get();

  if (!result) {
    return { session: null, user: null };
  }

  const { session, user } = result;

  // Check if session is expired
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return { session: null, user: null };
  }

  // Extend session if nearing expiry (less than 15 days left)
  if (session.expiresAt.getTime() - Date.now() < SESSION_RENEWAL_MS) {
    const newExpiresAt = new Date(Date.now() + SESSION_LIFESPAN_MS);
    await db
      .update(sessions)
      .set({ expiresAt: newExpiresAt })
      .where(eq(sessions.id, session.id));
    session.expiresAt = newExpiresAt;
  }

  return { session, user };
}

export async function invalidateSession(db: DbType, sessionToken: string) {
  await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
}
