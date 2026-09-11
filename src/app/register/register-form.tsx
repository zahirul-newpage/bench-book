"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { registerUser, type RegisterFormState } from "./actions";

const initialState: RegisterFormState = {};

export function RegisterForm() {
  const [state, formAction] = useActionState(registerUser, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
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
          minLength={8}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {state.errors?.password?.map((error) => (
          <p key={error} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="role" className="text-sm font-medium">
          Role
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue="scientist"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="scientist">Scientist</option>
          <option value="admin">Admin</option>
        </select>
        {state.errors?.role?.map((error) => (
          <p key={error} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      {state.message && !state.errors && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {state.message}
        </p>
      )}

      <SubmitButton pendingChildren="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
