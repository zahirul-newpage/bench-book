import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { reagents } from "@/db/schema";

export type Reagent = {
  id: string;
  name: string;
  unit: string;
  stock: number;
};

export async function listReagents(): Promise<Reagent[]> {
  const db = getDb();
  return db.query.reagents.findMany({ orderBy: asc(reagents.name) });
}

export async function getReagentById(id: string): Promise<Reagent | null> {
  const db = getDb();
  const row = await db.query.reagents.findFirst({
    where: eq(reagents.id, id),
  });
  return row ?? null;
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
  return updated ?? null;
}

export async function createReagent(input: {
  name: string;
  unit: string;
  stock: number;
}): Promise<Reagent> {
  const db = getDb();
  const [created] = await db
    .insert(reagents)
    .values({ id: crypto.randomUUID(), ...input })
    .returning();
  return created;
}
