"use client";

import { useRef } from "react";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { authenticateUser, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

const DEMO_ACCOUNTS = [
  { label: "Scientist", email: "scientist@benchbook.app", password: "bench-book-demo" },
  { label: "Admin", email: "admin@benchbook.app", password: "bench-book-admin" },
];

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState(authenticateUser, initialState);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Plain uncontrolled inputs everywhere else in this app read fine from
  // `formData` on submit — refs let a demo button fill them the same way a
  // user typing would, without turning these into controlled inputs (extra
  // state, an onChange handler) just for this one feature.
  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    if (emailRef.current) emailRef.current.value = account.email;
    if (passwordRef.current) passwordRef.current.value = account.password;
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        <p className="font-medium text-zinc-500 dark:text-zinc-500">
          Try it without registering
        </p>
        <div className="mt-1.5 flex flex-col gap-1">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemo(account)}
              className="w-fit rounded text-left underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              {account.label} — fill in {account.email}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          ref={emailRef}
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
          ref={passwordRef}
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
