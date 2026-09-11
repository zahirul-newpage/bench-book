"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertAdmin, AuthorizationError } from "@/lib/auth/authz";
import { reagentUpdateSchema, newReagentSchema } from "@/lib/schemas/reagent";
import { updateReagent, createReagent } from "@/lib/data/reagents";
import { auditLog } from "@/lib/audit";

export type ReagentUpdateFormState = {
  errors?: {
    stock?: string[];
    aliases?: string[];
  };
  message?: string;
};

export async function updateReagentStock(
  _prevState: ReagentUpdateFormState | undefined,
  formData: FormData
): Promise<ReagentUpdateFormState> {
  const session = await auth();
  try {
    assertAdmin(session);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      auditLog({
        actor: session?.user?.id ?? "anonymous",
        action: "reagent.update",
        outcome: "failure",
        details: { reason: "not_admin" },
      });
      return { message: "You must be an admin to update this reagent." };
    }
    throw error;
  }

  const validatedFields = reagentUpdateSchema.safeParse({
    reagentId: formData.get("reagentId"),
    stock: formData.get("stock"),
    aliases: formData.get("aliases") ?? undefined,
  });

  if (!validatedFields.success) {
    const tree = z.treeifyError(validatedFields.error);
    return {
      errors: {
        stock: tree.properties?.stock?.errors,
        aliases: tree.properties?.aliases?.errors,
      },
      message: "Please fix the errors below.",
    };
  }

  const updated = await updateReagent(validatedFields.data.reagentId, {
    stock: validatedFields.data.stock,
    aliases: validatedFields.data.aliases?.trim() || null,
  });

  if (!updated) {
    auditLog({
      actor: session.user.id,
      action: "reagent.update",
      target: validatedFields.data.reagentId,
      outcome: "failure",
      details: { reason: "not_found" },
    });
    return { message: "Reagent not found." };
  }

  auditLog({
    actor: session.user.id,
    action: "reagent.update",
    target: updated.id,
    outcome: "success",
    details: { newStock: updated.stock, aliases: updated.aliases },
  });

  revalidatePath("/admin");
  revalidatePath("/inventory");
  return { message: "Saved." };
}

export type NewReagentFormState = {
  errors?: {
    name?: string[];
    unit?: string[];
    aliases?: string[];
    stock?: string[];
  };
  message?: string;
};

export async function addReagent(
  _prevState: NewReagentFormState | undefined,
  formData: FormData
): Promise<NewReagentFormState> {
  const session = await auth();
  try {
    assertAdmin(session);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      auditLog({
        actor: session?.user?.id ?? "anonymous",
        action: "reagent.create",
        outcome: "failure",
        details: { reason: "not_admin" },
      });
      return { message: "You must be an admin to add a reagent." };
    }
    throw error;
  }

  const validatedFields = newReagentSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
    aliases: formData.get("aliases") ?? undefined,
    stock: formData.get("stock"),
  });

  if (!validatedFields.success) {
    const tree = z.treeifyError(validatedFields.error);
    return {
      errors: {
        name: tree.properties?.name?.errors,
        unit: tree.properties?.unit?.errors,
        aliases: tree.properties?.aliases?.errors,
        stock: tree.properties?.stock?.errors,
      },
      message: "Please fix the errors below.",
    };
  }

  const created = await createReagent({
    ...validatedFields.data,
    // Empty input means "no synonyms", stored as NULL rather than "".
    aliases: validatedFields.data.aliases?.trim() || null,
  });
  auditLog({
    actor: session.user.id,
    action: "reagent.create",
    target: created.id,
    outcome: "success",
    details: { name: created.name, stock: created.stock },
  });

  revalidatePath("/admin");
  revalidatePath("/inventory");
  return { message: "Reagent added." };
}
