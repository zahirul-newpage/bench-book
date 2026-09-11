import Link from "next/link";

// A small mark + wordmark, reused by both headers ((app)/layout.tsx and the
// landing page) so they stay visually identical. The mark reuses the same
// rounded-full dark-chip look already used elsewhere (step-number circles on
// the notebook detail page, the "New entry" button) rather than introducing
// a new visual language just for this.
export function Logo({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M9 2h6v6.5l4 8.5a2 2 0 0 1-1.8 2.9H6.8A2 2 0 0 1 5 16.9l4-8.4V2Z" />
          <path d="M9 2h6" />
          <path d="M7.5 14h9" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight">
        Bench Book
      </span>
    </Link>
  );
}
