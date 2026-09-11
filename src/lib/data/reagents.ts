import { asc, eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db/client";
import { reagents } from "@/db/schema";

export type Reagent = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  // Comma-separated admin-curated synonyms; see schema.ts for why these are
  // human-entered rather than model-inferred.
  aliases: string | null;
};

// Read by every bench on /inventory and /admin, written rarely (a stock
// update or a new reagent) — a classic hot, read-many, rebuildable-from-D1
// cache. KV is eventually consistent and never the source of truth: every
// write below invalidates it, and a miss just falls back to D1.
const CACHE_KEY = "reagents:list";

export async function listReagents(): Promise<Reagent[]> {
  const { env } = getCloudflareContext();

  const cached = await env.bench_book_cache.get<Reagent[]>(CACHE_KEY, "json");
  if (cached) return cached;

  const db = getDb();
  const rows = await db.query.reagents.findMany({ orderBy: asc(reagents.name) });

  // Best-effort — a cache write failure shouldn't fail the read.
  await env.bench_book_cache
    .put(CACHE_KEY, JSON.stringify(rows))
    .catch(() => {});

  return rows;
}

export async function getReagentById(id: string): Promise<Reagent | null> {
  const db = getDb();
  const row = await db.query.reagents.findFirst({
    where: eq(reagents.id, id),
  });
  return row ?? null;
}

async function invalidateReagentsCache(): Promise<void> {
  const { env } = getCloudflareContext();
  await env.bench_book_cache.delete(CACHE_KEY).catch(() => {});
}

export async function setReagentStock(
  id: string,
  stock: number
): Promise<Reagent | null> {
  const db = getDb();
  const [updated] = await db
    .update(reagents)
    .set({ stock })
    .where(eq(reagents.id, id))
    .returning();

  if (updated) await invalidateReagentsCache();
  return updated ?? null;
}

export async function createReagent(input: {
  name: string;
  unit: string;
  stock: number;
  aliases: string | null;
}): Promise<Reagent> {
  const db = getDb();
  const [created] = await db
    .insert(reagents)
    .values({ id: crypto.randomUUID(), ...input })
    .returning();

  await invalidateReagentsCache();
  return created;
}
