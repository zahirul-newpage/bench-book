import { and, desc, eq, asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  notebookEntries,
  entrySteps,
  entryReagents,
  entryPreparations,
} from "@/db/schema";
import type { NotebookEntryInput } from "@/lib/schemas/notebook-entry";
import { structureTranscript } from "@/lib/structuring";
import { listReagents } from "@/lib/data/reagents";

export type NotebookEntry = {
  id: string;
  benchId: string;
  rawTranscript: string;
  createdAt: string;
  steps: { order: number; text: string }[];
  reagents: {
    name: string;
    amount: string;
    concentration: string | null;
    reagentId: string | null;
  }[];
  preparations: { name: string; detail: string }[];
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
      preparations: true,
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
      preparations: true,
    },
  });
  return row ? toNotebookEntry(row) : null;
}

export async function createEntry(
  input: NotebookEntryInput & { authorId: string }
): Promise<NotebookEntry> {
  const knownReagents = await listReagents();
  const { steps, reagents, preparations } = await structureTranscript(
    input.rawTranscript,
    knownReagents
  );
  const db = getDb();

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  // One batched round trip (entry + all steps + reagents + preparations)
  // instead of
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
        concentration: reagent.concentration,
        reagentId: reagent.reagentId,
      })
    ),
    ...preparations.map((prep) =>
      db.insert(entryPreparations).values({
        id: crypto.randomUUID(),
        entryId: id,
        name: prep.name,
        detail: prep.detail,
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

  return {
    id,
    benchId: input.benchId,
    rawTranscript: input.rawTranscript,
    createdAt,
    steps,
    reagents,
    preparations,
  };
}

function toNotebookEntry(row: {
  id: string;
  benchId: string;
  rawTranscript: string;
  createdAt: string;
  steps: { orderIndex: number; text: string }[];
  reagents: {
    name: string;
    amount: string;
    concentration: string | null;
    reagentId: string | null;
  }[];
  preparations: { name: string; detail: string }[];
}): NotebookEntry {
  return {
    id: row.id,
    benchId: row.benchId,
    rawTranscript: row.rawTranscript,
    createdAt: row.createdAt,
    steps: row.steps.map((s) => ({ order: s.orderIndex, text: s.text })),
    reagents: row.reagents,
    preparations: row.preparations,
  };
}

// Ownership-scoped delete — mirrors getEntryById's authorId check so a
// scientist can only delete their own entries. entry_steps and
// entry_reagents/entry_preparations cascade via the FK's onDelete: "cascade".
export async function deleteEntry(
  id: string,
  authorId: string
): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(notebookEntries)
    .where(and(eq(notebookEntries.id, id), eq(notebookEntries.authorId, authorId)))
    .returning({ id: notebookEntries.id });
  return deleted.length > 0;
}
