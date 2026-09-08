import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

/**
 * Returns a Drizzle client bound to the D1 database for the current request.
 * MUST be called inside a request handler — getCloudflareContext() throws
 * if called at module load time.
 */
export function getDb() {
  const { env } = getCloudflareContext();
  return drizzle(env.bench_book_db, { schema });
}

export type Db = ReturnType<typeof getDb>;
