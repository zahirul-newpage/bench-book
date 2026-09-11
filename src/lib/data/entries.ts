import { and, desc, eq, asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notebookEntries, entrySteps, entryReagents } from "@/db/schema";
import type { NotebookEntryInput } from "@/lib/schemas/notebook-entry";
import { structureTranscript } from "@/lib/structuring";

export type NotebookEntry = {
  id: string;
  benchId: string;
  rawTranscript: string;
  createdAt: string;
  steps: { order: number; text: string }[];
  reagents: { name: string; amount: string }[];
};

// Entries are private to the scientist who dictated them — every read is
// scoped to authorId, both the list and a direct lookup by id. Scoping only
// the list and not the by-id lookup would still let someone view another
// user's entry by pasting its URL.
export async function listEntries(authorId: string): Promise<NotebookEntry[]> {
  const db = getDb();
  const rows = await db.query.notebookEntries.findMany({
    where: eq(notebookEntries.authorId, authorId),
    orderBy: desc(notebookEntries.createdAt),
    with: {
      steps: { orderBy: asc(entrySteps.orderIndex) },
      reagents: true,
    },
  });
  return rows.map(toNotebookEntry);
}

export async function getEntryById(
  id: string,
  authorId: string
): Promise<NotebookEntry | null> {
  const db = getDb();
  const row = await db.query.notebookEntries.findFirst({
    where: and(
      eq(notebookEntries.id, id),
      eq(notebookEntries.authorId, authorId)
    ),
    with: {
      steps: { orderBy: asc(entrySteps.orderIndex) },
      reagents: true,
    },
  });
  return row ? toNotebookEntry(row) : null;
}

export async function createEntry(
  input: NotebookEntryInput & { authorId: string }
): Promise<NotebookEntry> {
  const { steps, reagents } = structureTranscript(input.rawTranscript);
  const db = getDb();

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  // One batched round trip (entry + all steps + all reagents) instead of
  // separate awaited inserts — keeps this under D1's per-statement overhead
  // and avoids partial writes if the write fails partway through.
  const statements = [
    db.insert(notebookEntries).values({
      id,
      benchId: input.benchId,
      rawTranscript: input.rawTranscript,
      authorId: input.authorId,
      createdAt,
    }),
    ...steps.map((step) =>
      db.insert(entrySteps).values({
        id: crypto.randomUUID(),
        entryId: id,
        orderIndex: step.order,
        text: step.text,
      })
    ),
    ...reagents.map((reagent) =>
      db.insert(entryReagents).values({
        id: crypto.randomUUID(),
        entryId: id,
        name: reagent.name,
        amount: reagent.amount,
      })
    ),
  ] as const;

  if (statements.length > 1) {
    await db.batch(
      statements as [(typeof statements)[number], ...(typeof statements)[number][]]
    );
  } else {
    await statements[0];
  }

  return { id, benchId: input.benchId, rawTranscript: input.rawTranscript, createdAt, steps, reagents };
}

function toNotebookEntry(row: {
  id: string;
  benchId: string;
  rawTranscript: string;
  createdAt: string;
  steps: { orderIndex: number; text: string }[];
  reagents: { name: string; amount: string }[];
}): NotebookEntry {
  return {
    id: row.id,
    benchId: row.benchId,
    rawTranscript: row.rawTranscript,
    createdAt: row.createdAt,
    steps: row.steps.map((s) => ({ order: s.orderIndex, text: s.text })),
    reagents: row.reagents,
  };
}
