"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { updateReagentStock, type ReagentUpdateFormState } from "./actions";
import type { Reagent } from "@/lib/data/reagents";

const initialState: ReagentUpdateFormState = {};

const SAVE_BUTTON_CLASSNAME =
  "rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300";

export function ReagentRow({ reagent }: { reagent: Reagent }) {
  const [state, formAction] = useActionState(
    updateReagentStock,
    initialState
  );

  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <form action={formAction} className="flex flex-col gap-1.5">
        <input type="hidden" name="reagentId" value={reagent.id} />
        <div className="flex items-center gap-3">
          <p className="w-32 flex-none truncate font-medium" title={reagent.name}>
            {reagent.name}
          </p>
          <input
            type="text"
            name="aliases"
            aria-label="Also called (optional, comma-separated)"
            defaultValue={reagent.aliases ?? ""}
            placeholder="also called: sodium chloride, table salt"
            title="Comma-separated. Must mean the same thing — don't drop a pH or % (“Tris” would wrongly match a pH 7.5 dictation)."
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <input
            type="number"
            name="stock"
            min={0}
            step="any"
            defaultValue={reagent.stock}
            className="w-24 flex-none rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <span className="w-10 flex-none text-sm text-zinc-500 dark:text-zinc-400">
            {reagent.unit}
          </span>
          <SubmitButton pendingChildren="Saving…" className={SAVE_BUTTON_CLASSNAME}>
            Save
          </SubmitButton>
        </div>

        {(state.errors?.aliases || state.errors?.stock) && (
          <div className="flex flex-wrap gap-x-3">
            {state.errors?.aliases?.map((error) => (
              <p key={error} className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            ))}
            {state.errors?.stock?.map((error) => (
              <p key={error} className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            ))}
          </div>
        )}
        {state.message && !state.errors && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {state.message}
          </p>
        )}
      </form>
    </li>
  );
}
