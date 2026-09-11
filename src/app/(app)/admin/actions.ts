"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertAdmin, AuthorizationError } from "@/lib/auth/authz";
import { reagentStockSchema, newReagentSchema } from "@/lib/schemas/reagent";
import { setReagentStock, createReagent } from "@/lib/data/reagents";

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
    return { message: "Reagent not found." };
  }

  revalidatePath("/admin");
  revalidatePath("/inventory");
  return { message: "Stock updated." };
}

export type NewReagentFormState = {
  errors?: {
    name?: string[];
    unit?: string[];
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
      return { message: "You must be an admin to add a reagent." };
    }
    throw error;
  }

  const validatedFields = newReagentSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
    stock: formData.get("stock"),
  });

  if (!validatedFields.success) {
    const tree = z.treeifyError(validatedFields.error);
    return {
      errors: {
        name: tree.properties?.name?.errors,
        unit: tree.properties?.unit?.errors,
        stock: tree.properties?.stock?.errors,
      },
      message: "Please fix the errors below.",
    };
  }

  await createReagent(validatedFields.data);

  revalidatePath("/admin");
  revalidatePath("/inventory");
  return { message: "Reagent added." };
}
