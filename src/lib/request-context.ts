import { headers } from "next/headers";

// CF-Connecting-IP is the only client-IP header trustworthy on Cloudflare —
// anything else (X-Forwarded-For, etc.) can be spoofed by the caller.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? "unknown";
}
