"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { deleteEntry } from "@/lib/data/entries";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";

// Ownership is enforced in deleteEntry itself (authorId scoped delete), same
// pattern as getEntryById — a scientist can only ever delete their own entry,
// admins included, there's no "delete any entry" path.
export async function deleteNotebookEntry(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const deleted = await deleteEntry(id, session.user.id);
  auditLog({
    actor: session.user.id,
    action: "notebook_entry.delete",
    target: id,
    outcome: deleted ? "success" : "failure",
  });

  revalidatePath("/notebook");
  redirect("/notebook");
}
