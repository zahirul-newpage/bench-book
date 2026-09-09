"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertAdmin, AuthorizationError } from "@/lib/auth/authz";
import { reagentStockSchema, newReagentSchema } from "@/lib/schemas/reagent";
import { setReagentStock, createReagent } from "@/lib/data/reagents";
import { auditLog } from "@/lib/audit";

export type ReagentStockFormState = {
  errors?: {
    stock?: string[];
  };
  message?: string;
};

export async function updateReagentStock(
  _prevState: ReagentStockFormState | undefined,
  formData: FormData
): Promise<ReagentStockFormState> {
  const session = await auth();
  try {
    assertAdmin(session);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      auditLog({
        actor: session?.user?.id ?? "anonymous",
        action: "reagent.stock_update",
        outcome: "failure",
        details: { reason: "not_admin" },
      });
      return { message: "You must be an admin to update stock." };
    }
    throw error;
  }

  const validatedFields = reagentStockSchema.safeParse({
    reagentId: formData.get("reagentId"),
    stock: formData.get("stock"),
  });

  if (!validatedFields.success) {
    const tree = z.treeifyError(validatedFields.error);
    return {
      errors: { stock: tree.properties?.stock?.errors },
      message: "Please fix the errors below.",
    };
  }

  const updated = await setReagentStock(
    validatedFields.data.reagentId,
    validatedFields.data.stock
  );

  if (!updated) {
    auditLog({
      actor: session.user.id,
      action: "reagent.stock_update",
      target: validatedFields.data.reagentId,
      outcome: "failure",
      details: { reason: "not_found" },
    });
    return { message: "Reagent not found." };
  }

  auditLog({
    actor: session.user.id,
    action: "reagent.stock_update",
    target: updated.id,
    outcome: "success",
    details: { newStock: updated.stock },
  });

  revalidatePath("/admin");
  revalidatePath("/inventory");
  return { message: "Stock updated." };
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
