import { drizzle } from "drizzle-orm/d1";
import { eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { reagents } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { REAGENTS_CACHE_KEY } from "@/lib/data/reagents";
import { updateStockDeductionStatus } from "@/lib/data/stock-deduction-log";
import type { StockDeductionMessage } from "./stock-deduction";

// Retries beyond this are dropped by the platform (no dead-letter queue is
// configured) — kept in sync with wrangler.jsonc's consumer max_retries by
// hand, since that config isn't readable from inside the Worker at runtime.
const MAX_RETRIES = 3;

// A queue consumer runs outside any HTTP request, so it never has an
// OpenNext request context — getDb()/getCloudflareContext() would throw here.
// The Workers `env` passed into the queue() handler is used directly instead.
export async function handleStockDeductionBatch(
  batch: MessageBatch<StockDeductionMessage>,
  env: CloudflareEnv
): Promise<void> {
  const db = drizzle(env.bench_book_db, { schema });
  let anySucceeded = false;

  for (const message of batch.messages) {
    const { taskId, reagentId, amount, entryId } = message.body;

    // Visible on /admin the moment work actually starts, distinct from
    // "queued" (sent, not yet picked up) — the row the producer created
    // stays "queued" until this update lands.
    await updateStockDeductionStatus(db, taskId, "in_progress").catch(() => {});

    try {
      // Same relative, floor-at-zero update used when this was inline in
      // createEntry's D1 batch — see reagents.ts's history for why it's a
      // relative SQL expression rather than read-then-write.
      await db
        .update(reagents)
        .set({ stock: sql`max(0, ${reagents.stock} - ${amount})` })
        .where(eq(reagents.id, reagentId));

      auditLog({
        actor: "system:stock-deduction-queue",
        action: "reagent.stock_deduct",
        target: reagentId,
        outcome: "success",
        details: { entryId, amount },
      });
      // The stock update already succeeded at this point — wrapped in its
      // own catch so that a failure writing the STATUS ROW can never fall
      // into the outer catch below and trigger message.retry(), which would
      // deduct the same amount a second time.
      await updateStockDeductionStatus(db, taskId, "success", null).catch(() => {});
      message.ack();
      anySucceeded = true;
    } catch (error) {
      // attempts is 1 on the first delivery, so this is the LAST attempt
      // once it reaches MAX_RETRIES — after that, message.retry() below
      // still runs, but the platform will have exhausted its own retry
      // budget and drop it. Only mark "failed" (terminal) here on that last
      // attempt; otherwise this failure will be retried, so the row goes
      // back to "queued" — with the error kept, so an admin can see why the
      // last attempt failed even while it's still pending redelivery.
      const isFinalAttempt = message.attempts >= MAX_RETRIES;
      await updateStockDeductionStatus(
        db,
        taskId,
        isFinalAttempt ? "failed" : "queued",
        String(error)
      ).catch(() => {});

      auditLog({
        actor: "system:stock-deduction-queue",
        action: "reagent.stock_deduct",
        target: reagentId,
        outcome: "failure",
        details: { entryId, amount, attempt: message.attempts, final: isFinalAttempt, error: String(error) },
      });
      // Don't retry() here on top of it — max_retries in wrangler.jsonc's
      // consumer config already governs redelivery. After retries are
      // exhausted the platform drops the message; the status row above
      // (left "failed") is what tells an admin a deduction never landed.
      message.retry();
    }
  }

  // One cache bust for the whole batch, not per message — same
  // best-effort, KV-is-a-cache posture as everywhere else in reagents.ts.
  if (anySucceeded) {
    await env.bench_book_cache.delete(REAGENTS_CACHE_KEY).catch(() => {});
  }
}
