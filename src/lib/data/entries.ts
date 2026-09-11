import { and, desc, eq, asc } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db/client";
import {
  notebookEntries,
  entrySteps,
  entryReagents,
  entryPreparations,
} from "@/db/schema";
import type { NotebookEntryInput } from "@/lib/schemas/notebook-entry";
import { structureTranscript } from "@/lib/structuring";
import { listReagents, type Reagent } from "@/lib/data/reagents";
import type { StockDeductionMessage } from "@/lib/queue/stock-deduction";
import {
  createQueuedStockDeduction,
  updateStockDeductionStatus,
} from "@/lib/data/stock-deduction-log";
import { auditLog } from "@/lib/audit";

// Matches "5 g", "50 mL", "1.5mg" — amount is guaranteed by the structuring
// prompt to be a bare quantity + unit (never a concentration), so a strict
// number+unit shape is expected, not scraped from free text.
function parseAmount(amount: string): { value: number; unit: string } | null {
  const match = amount.trim().match(/^([\d.]+)\s*([a-zA-Zµ]+)$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, unit: match[2] };
}

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

// Builds one queue message per reagent that both matched inventory AND has a
// parseable, unit-compatible amount — the actual deduction happens later, in
// the queue consumer (src/lib/queue/stock-deduction-consumer.ts), not here.
// Deliberately conservative: no reagentId (nothing to deduct from), an
// unparseable amount (the scientist never stated a quantity), or a unit that
// doesn't match the inventory item's stocked unit (dictated "5 g" against a
// reagent stocked in "mL" — a real mismatch, not something to silently
// coerce) all skip deduction rather than guess. A skip only means "stock
// wasn't auto-adjusted," never a failure — the entry still saves either way.
function buildStockDeductionMessages(
  entryId: string,
  reagents: { amount: string; reagentId: string | null }[],
  knownReagents: Reagent[]
): StockDeductionMessage[] {
  const byId = new Map(knownReagents.map((r) => [r.id, r]));
  const messages: StockDeductionMessage[] = [];

  for (const reagent of reagents) {
    if (!reagent.reagentId) continue;
    const inventoryItem = byId.get(reagent.reagentId);
    if (!inventoryItem) continue;

    const parsed = parseAmount(reagent.amount);
    if (!parsed) {
      console.warn("[createEntry] skipping stock deduction: unparseable amount", {
        reagentId: reagent.reagentId,
        amount: reagent.amount,
      });
      continue;
    }
    if (parsed.unit.toLowerCase() !== inventoryItem.unit.toLowerCase()) {
      console.warn("[createEntry] skipping stock deduction: unit mismatch", {
        reagentId: reagent.reagentId,
        dictatedUnit: parsed.unit,
        inventoryUnit: inventoryItem.unit,
      });
      continue;
    }

    messages.push({
      taskId: crypto.randomUUID(),
      reagentId: reagent.reagentId,
      reagentName: inventoryItem.name,
      amount: parsed.value,
      entryId,
    });
  }

  return messages;
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

  // Stock deduction happens off the request path, via a queue consumer —
  // see stock-deduction-consumer.ts. This means the entry save and the stock
  // update no longer succeed/fail atomically together (the old D1-batch
  // version did guarantee that). Traded deliberately: the scientist's save
  // must feel instant, and inventory bookkeeping is fine to trail behind by
  // a few seconds.
  const deductionMessages = buildStockDeductionMessages(id, reagents, knownReagents);
  if (deductionMessages.length > 0) {
    // Each task's log row is created "queued" BEFORE the message is sent, so
    // that state is observable on /admin immediately rather than only once
    // the consumer picks the message up — and so that if sending itself
    // fails (caught below), there's already a row to mark "failed" instead
    // of that failure mode having no row at all.
    await Promise.all(
      deductionMessages.map((message) =>
        createQueuedStockDeduction(db, {
          id: message.taskId,
          entryId: message.entryId,
          reagentId: message.reagentId,
          reagentName: message.reagentName,
          amount: message.amount,
        })
      )
    );

    try {
      const { env } = getCloudflareContext();
      await env.STOCK_DEDUCTION_QUEUE.sendBatch(
        deductionMessages.map((body) => ({ body }))
      );
    } catch (error) {
      auditLog({
        actor: input.authorId,
        action: "reagent.stock_deduct_enqueue",
        target: id,
        outcome: "failure",
        details: { error: String(error), reagentIds: deductionMessages.map((m) => m.reagentId) },
      });
      // The consumer normally transitions these rows — it never ran, so
      // this is the only place that can mark them terminally failed rather
      // than leaving them stuck at "queued" forever.
      await Promise.all(
        deductionMessages.map((message) =>
          updateStockDeductionStatus(
            db,
            message.taskId,
            "failed",
            `enqueue failed: ${String(error)}`
          )
        )
      );
    }
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
