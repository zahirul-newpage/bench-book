import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";

export class AuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Server Action guard: throws so the action can return a typed error state. */
export function assertAdmin(session: Session | null): void {
  if (session?.user?.role !== "admin") {
    throw new AuthorizationError("Admin role required");
  }
}

/**
 * Page guard: redirects to /login if signed out. Defense-in-depth alongside
 * proxy.ts — call at the top of every protected page, not just /admin.
 */
export async function requireSession(fromPath: string): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?from=${encodeURIComponent(fromPath)}`);
  }
  return session;
}

/** Page guard: requires an admin session, redirecting non-admins to /notebook. */
export async function requireAdmin(fromPath: string): Promise<Session> {
  const session = await requireSession(fromPath);
  if (session.user.role !== "admin") {
    redirect("/notebook");
  }
  return session;
}
