import { desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import { stockDeductionLog } from "@/db/schema";

export type StockDeductionStatus = "queued" | "in_progress" | "success" | "failed";

export type StockDeductionLogEntry = {
  id: string;
  entryId: string;
  reagentId: string;
  reagentName: string;
  amount: number;
  status: StockDeductionStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

// Creates the task row as "queued" — called by createEntry right before it
// sends the matching message to the queue, using the SAME id, so the
// consumer updates this row in place instead of inserting a new one.
export async function createQueuedStockDeduction(
  db: Db,
  entry: {
    id: string;
    entryId: string;
    reagentId: string;
    reagentName: string;
    amount: number;
  }
): Promise<void> {
  const now = new Date().toISOString();
  await db.insert(stockDeductionLog).values({
    id: entry.id,
    entryId: entry.entryId,
    reagentId: entry.reagentId,
    reagentName: entry.reagentName,
    amount: entry.amount,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  });
}

// Transitions an existing task row. Accepts an explicit `db` rather than
// calling getDb() itself — the queue consumer that's the main caller runs
// outside any HTTP request, so it has no request-scoped
// getCloudflareContext() to build one from (see stock-deduction-consumer.ts).
//
// errorMessage has three states, not two: omitted leaves the column as-is
// (used for "in_progress", which has nothing new to say about a prior
// error), a string sets it (a failed attempt), and explicit `null` clears
// it (success). Success MUST clear it explicitly — otherwise a task that
// failed once, retried, and then succeeded would still show a stale red
// error message from the earlier failed attempt on what /admin renders as
// a "Deducted" row. That exact case was caught testing this by hand:
// queued -> in_progress -> queued (failed, error set) -> success left the
// old error_message sitting there until this was fixed.
export async function updateStockDeductionStatus(
  db: Db,
  id: string,
  status: StockDeductionStatus,
  errorMessage?: string | null
): Promise<void> {
  await db
    .update(stockDeductionLog)
    .set({
      status,
      ...(errorMessage !== undefined ? { errorMessage } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(stockDeductionLog.id, id));
}

// Admin-facing read — always on the request path (the /admin page), so
// getDb() is fine here.
export async function listRecentStockDeductions(
  limit = 50
): Promise<StockDeductionLogEntry[]> {
  const db = getDb();
  return db.query.stockDeductionLog.findMany({
    orderBy: desc(stockDeductionLog.createdAt),
    limit,
  });
}
