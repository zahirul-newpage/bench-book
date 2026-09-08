import { hashPassword } from "@/lib/auth/password";

export type Role = "admin" | "scientist";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
};

const users: User[] = [];

const seeded = Promise.all([
  hashPassword("bench-book-demo").then((passwordHash) => {
    users.push({
      id: "user-1",
      email: "scientist@benchbook.app",
      passwordHash,
      role: "scientist",
    });
  }),
  hashPassword("bench-book-admin").then((passwordHash) => {
    users.push({
      id: "user-2",
      email: "admin@benchbook.app",
      passwordHash,
      role: "admin",
    });
  }),
]);

export async function findUserByEmail(email: string): Promise<User | null> {
  await seeded;
  return users.find((u) => u.email === email) ?? null;
}
