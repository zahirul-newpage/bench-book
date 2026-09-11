"use client";

import { useEffect } from "react";

export default function LoginError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
          Something went wrong.
        </h2>
        <p className="text-sm text-red-800 dark:text-red-200">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => retry()}
          className="rounded-full bg-red-900 px-4 py-2 text-sm font-medium text-red-50 hover:bg-red-800 dark:bg-red-100 dark:text-red-950 dark:hover:bg-red-200"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
