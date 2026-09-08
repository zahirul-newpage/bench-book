import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/authz";
import { getEntryById } from "@/lib/data/entries";

export const dynamic = "force-dynamic";

export default async function NotebookEntryPage(
  props: PageProps<"/notebook/[id]">
) {
  const { id } = await props.params;
  await requireSession(`/notebook/${id}`);

  const entry = await getEntryById(id);

  if (!entry) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/notebook"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to notebook
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {entry.benchId}
          </h1>
          <time
            dateTime={entry.createdAt}
            className="text-sm text-zinc-500 dark:text-zinc-400"
          >
            {new Date(entry.createdAt).toLocaleString()}
          </time>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Dictated entry
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {entry.rawTranscript}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Steps
          </h2>
          {entry.steps.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              No steps identified.
            </p>
          ) : (
            <ol className="mt-3 flex flex-col gap-3">
              {entry.steps.map((step) => (
                <li key={step.order} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
                    {step.order}
                  </span>
                  <span className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                    {step.text}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Reagents used
          </h2>
          {entry.reagents.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              No reagents identified.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {entry.reagents.map((reagent) => (
                <li
                  key={reagent.name}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {reagent.name}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {reagent.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
