import type {
  StockDeductionLogEntry,
  StockDeductionStatus,
} from "@/lib/data/stock-deduction-log";

const STATUS_STYLES: Record<StockDeductionStatus, string> = {
  queued:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  in_progress:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_LABELS: Record<StockDeductionStatus, string> = {
  queued: "Queued",
  in_progress: "In progress",
  success: "Deducted",
  failed: "Failed",
};

// Renders the queue's full lifecycle per task — see
// stock-deduction-consumer.ts, which transitions each row through
// queued -> in_progress -> success | failed (or back to "queued" while a
// retry is still pending), and entries.ts's createEntry, which creates the
// row "queued" before the message is even sent.
export function StockDeductionLogSection({
  entries,
}: {
  entries: StockDeductionLogEntry[];
}) {
  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Stock deduction queue
      </h2>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        Recent attempts to deduct dictated reagent usage from stock — queued
        the moment an entry is saved, then in progress and deducted or failed
        a few seconds later. A row stuck at &ldquo;Queued&rdquo; or
        &ldquo;In progress&rdquo; for more than a minute likely means the
        queue never processed it.
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No deductions recorded yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[entry.status]}`}
                  >
                    {STATUS_LABELS[entry.status]}
                  </span>
                  <span className="font-medium">{entry.reagentName}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    −{entry.amount}
                  </span>
                </div>
                {entry.errorMessage && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {entry.errorMessage}
                  </p>
                )}
              </div>
              <time
                dateTime={entry.updatedAt}
                className="flex-none whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400"
              >
                {new Date(entry.updatedAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
