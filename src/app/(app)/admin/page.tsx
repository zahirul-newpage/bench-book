import { requireAdmin } from "@/lib/auth/authz";
import { listReagents } from "@/lib/data/reagents";
import { ReagentRow } from "./reagent-row";
import { NewReagentForm } from "./reagent-form";

// Reagent stock changes on every save (see updateReagentStock) — must reflect
// the latest values per request, not a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin("/admin");

  const reagents = await listReagents();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Admin · Reagent stock
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Update stock levels for the shared lab inventory.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {reagents.map((reagent) => (
          <ReagentRow
            key={`${reagent.id}:${reagent.stock}`}
            reagent={reagent}
          />
        ))}
      </ul>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Add a new reagent
        </h2>
        <NewReagentForm />
      </div>
    </div>
  );
}
