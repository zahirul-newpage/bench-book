import Link from "next/link";
import { requireSession } from "@/lib/auth/authz";
import { listEntries } from "@/lib/data/entries";

// Entries are private per author and updated on every write (see
// createNotebookEntry) — this must reflect the latest entries per request,
// not a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function NotebookPage() {
  const session = await requireSession("/notebook");

  const entries = await listEntries(session.user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Notebook</h1>
        <Link
          href="/notebook/new"
          className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New entry
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No entries yet. Dictate your first one at the bench.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium">{entry.benchId}</span>
                <div className="flex items-center gap-3">
                  <time dateTime={entry.createdAt}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </time>
                  <Link
                    href={`/notebook/${entry.id}`}
                    aria-label="View structured steps and reagents"
                    title="View structured steps and reagents"
                    className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-50"
                  >
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
                      <rect x="4" y="3" width="16" height="18" rx="2" />
                      <path d="M8 8h8M8 12h8M8 16h5" />
                    </svg>
                  </Link>
                </div>
              </div>
              {/* Truncated to 3 lines here — the full text (plus structured
                  steps/reagents) is what the detail page behind the eye
                  icon above is for, not this list. */}
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {entry.rawTranscript}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
