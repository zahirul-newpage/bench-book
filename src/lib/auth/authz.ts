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
export function assertAdmin(
  session: Session | null
): asserts session is Session {
  if (session?.user?.role !== "admin") {
    throw new AuthorizationError("Admin role required");
  }
}

/**
 * Page guard: redirects to /login if signed out. This is the PRIMARY gate —
 * there is deliberately no proxy.ts. Under OpenNext's Cloudflare adapter, the
 * proxy/middleware layer and the main request handler disagreed about the
 * request's protocol (proxy saw HTTPS and looked for a `__Secure-`-prefixed
 * session cookie; the real cookie, set over plain local HTTP, had no prefix),
 * so a valid, freshly-issued session was rejected at the proxy every time —
 * confirmed via the Set-Cookie headers on the wrongly-redirected response.
 * Page-level guards call auth() directly in the same context that issued the
 * cookie, so they don't hit this mismatch. Call this at the top of every
 * protected page, not just /admin.
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
