import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";

export type Role = "admin" | "scientist";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
};

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const row = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  return row ?? null;
}
