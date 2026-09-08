"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { authenticateUser, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState(authenticateUser, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="scientist@benchbook.app"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {state.errors?.email?.map((error) => (
          <p key={error} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {state.errors?.password?.map((error) => (
          <p key={error} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      {state.message && !state.errors && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}

      <SubmitButton pendingChildren="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
