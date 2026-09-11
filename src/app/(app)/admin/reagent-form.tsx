"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { addReagent, type NewReagentFormState } from "./actions";

const initialState: NewReagentFormState = {};

const ADD_BUTTON_CLASSNAME =
  "rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300";

export function NewReagentForm() {
  const [state, formAction] = useActionState(addReagent, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950"
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="name" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Tris buffer, pH 7.4"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {state.errors?.name?.map((error) => (
            <p key={error} className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="aliases" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Also called <span className="font-normal">(optional)</span>
          </label>
          <input
            id="aliases"
            name="aliases"
            type="text"
            placeholder="sodium chloride, table salt"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Comma-separated. Must mean the same thing — don&apos;t drop a pH or
            % (&ldquo;Tris&rdquo; would wrongly match a pH 7.5 dictation).
          </p>
          {state.errors?.aliases?.map((error) => (
            <p key={error} className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          ))}
        </div>

        <div className="flex w-24 flex-col gap-1">
          <label htmlFor="unit" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Unit
          </label>
          <input
            id="unit"
            name="unit"
            type="text"
            required
            placeholder="mL"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {state.errors?.unit?.map((error) => (
            <p key={error} className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          ))}
        </div>

        <div className="flex w-28 flex-col gap-1">
          <label htmlFor="stock" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Initial stock
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min={0}
            step="any"
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {state.errors?.stock?.map((error) => (
            <p key={error} className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          ))}
        </div>

        <div className="pt-5">
          <SubmitButton pendingChildren="Adding…" className={ADD_BUTTON_CLASSNAME}>
            Add reagent
          </SubmitButton>
        </div>
      </div>

      {state.message && !state.errors && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {state.message}
        </p>
      )}
    </form>
  );
}
