import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getClientIp } from "@/lib/request-context";

// If TURNSTILE_SECRET_KEY isn't set, verification is skipped entirely — the
// form still works before Turnstile is configured (local dev, or before you
// create a widget in the dashboard). Once the secret is set, a missing or
// invalid token is rejected.
export async function verifyTurnstile(token: string | null): Promise<boolean> {
  const { env } = getCloudflareContext();
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;

  if (!token) return false;

  const form = new URLSearchParams({
    secret,
    response: token,
    remoteip: await getClientIp(),
  });

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form }
  );

  const result = (await response.json()) as { success: boolean };
  return result.success;
}
