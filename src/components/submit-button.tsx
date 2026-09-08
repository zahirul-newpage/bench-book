"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

const DEFAULT_CLASSNAME =
  "rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300";

export function SubmitButton({
  children,
  pendingChildren,
  className = DEFAULT_CLASSNAME,
}: {
  children: ReactNode;
  pendingChildren: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingChildren : children}
    </button>
  );
}
