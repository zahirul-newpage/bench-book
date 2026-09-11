import { requireSession } from "@/lib/auth/authz";
import { NotebookEntryForm } from "./notebook-entry-form";

// A fresh, unique default every time this page loads — not reused from any
// prior entry — so the scientist never has to type a Bench ID to dictate
// and save. Still just a default: the field stays editable for whoever
// wants their own name for it.
function generateDefaultBenchId(): string {
  return `Bench-${crypto.randomUUID().slice(0, 8)}`;
}

export default async function NewNotebookEntryPage() {
  await requireSession("/notebook/new");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New entry</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Dictate what you&rsquo;re doing at the bench — steps, reagents and
          amounts get structured automatically.
        </p>
      </div>
      <NotebookEntryForm defaultBenchId={generateDefaultBenchId()} />
    </div>
  );
}
