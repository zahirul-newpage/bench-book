import { requireSession } from "@/lib/auth/authz";
import { listReagents } from "@/lib/data/reagents";

// Shared live inventory, deducted/adjusted from many benches (and by admins) —
// must reflect the latest values per request, not a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  await requireSession("/inventory");

  const reagents = await listReagents();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Shared reagent stock, live across every bench.
        </p>
      </div>

      {reagents.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No reagents in stock yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reagents.map((reagent) => (
            <li
              key={reagent.id}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <span className="font-medium">{reagent.name}</span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {reagent.stock} {reagent.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
