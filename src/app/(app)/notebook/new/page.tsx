import { requireSession } from "@/lib/auth/authz";
import { NotebookEntryForm } from "./notebook-entry-form";

export default async function NewNotebookEntryPage() {
  await requireSession("/notebook/new");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">New entry</h1>
      <NotebookEntryForm />
    </div>
  );
}
