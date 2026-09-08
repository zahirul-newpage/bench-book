"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { registerSchema } from "@/lib/schemas/register";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";

export type RegisterFormState = {
  errors?: {
    email?: string[];
    password?: string[];
    role?: string[];
  };
  message?: string;
};

export async function registerUser(
  _prevState: RegisterFormState | undefined,
  formData: FormData
): Promise<RegisterFormState> {
  const validatedFields = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!validatedFields.success) {
    const tree = z.treeifyError(validatedFields.error);
    return {
      errors: {
        email: tree.properties?.email?.errors,
        password: tree.properties?.password?.errors,
        role: tree.properties?.role?.errors,
      },
      message: "Please fix the errors below.",
    };
  }

  const { email, password, role } = validatedFields.data;
  const db = getDb();

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return {
      errors: { email: ["An account with this email already exists."] },
      message: "Please fix the errors below.",
    };
  }

  const passwordHash = await hashPassword(password);
  try {
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email,
      passwordHash,
      role,
    });
  } catch (error) {
    // Unique constraint on email — handles the rare race where two
    // registrations for the same address land between our check and insert.
    if (error instanceof Error && /unique/i.test(error.message)) {
      return {
        errors: { email: ["An account with this email already exists."] },
        message: "Please fix the errors below.",
      };
    }
    throw error;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/notebook" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "Account created — sign in below." };
    }
    throw error;
  }

  return {};
}
