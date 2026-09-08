"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { notebookEntrySchema } from "@/lib/schemas/notebook-entry";
import { createEntry } from "@/lib/data/entries";
import { auth } from "@/auth";

export type NotebookEntryFormState = {
  errors?: {
    benchId?: string[];
    rawTranscript?: string[];
  };
  message?: string;
};

export async function createNotebookEntry(
  _prevState: NotebookEntryFormState,
  formData: FormData
): Promise<NotebookEntryFormState> {
  const session = await auth();
  if (!session?.user) {
    return { message: "You must be signed in to save an entry." };
  }

  const validatedFields = notebookEntrySchema.safeParse({
    benchId: formData.get("benchId"),
    rawTranscript: formData.get("rawTranscript"),
  });

  if (!validatedFields.success) {
    const tree = z.treeifyError(validatedFields.error);
    return {
      errors: {
        benchId: tree.properties?.benchId?.errors,
        rawTranscript: tree.properties?.rawTranscript?.errors,
      },
      message: "Please fix the errors below.",
    };
  }

  await createEntry({ ...validatedFields.data, authorId: session.user.id });
  revalidatePath("/notebook");
  redirect("/notebook");
}
