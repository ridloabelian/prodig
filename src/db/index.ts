import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb(env: any) {
  if (!env || !env.DB) {
    throw new Error("Cloudflare D1 Database binding 'DB' is not configured.");
  }
  return drizzle(env.DB, { schema });
}
export { schema };
export type DbType = ReturnType<typeof getDb>;
