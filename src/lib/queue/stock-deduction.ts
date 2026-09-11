// One message = one reagent's worth of stock to consume, produced by
// createEntry once a dictated reagent has both an inventory match and a
// parseable, unit-compatible amount (see entries.ts's buildStockDeductionMessages).
export type StockDeductionMessage = {
  // Shared with the stock_deduction_log row this task corresponds to — the
  // producer (entries.ts) creates that row as "queued" using this same id,
  // and the consumer updates it in place rather than inserting a new row,
  // which is what makes "queued"/"in_progress" observable at all.
  taskId: string;
  reagentId: string;
  // Denormalized from the inventory item known at enqueue time — spares the
  // consumer (which can't use the request-scoped listReagents()/KV cache
  // path) an extra D1 read just to log a human-readable name.
  reagentName: string;
  amount: number;
  entryId: string;
};
