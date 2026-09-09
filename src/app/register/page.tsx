import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { RegisterForm } from "./register-form";

// Reads the Turnstile sitekey from the Cloudflare env at request time — must
// not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const { env } = getCloudflareContext();
  const sitekey = env.TURNSTILE_SITEKEY || null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold tracking-tight">
          Create a Bench Book account
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Choose Scientist for bench work, or Admin to manage reagent stock.
        </p>
        <div className="mt-6">
          <RegisterForm sitekey={sitekey} />
        </div>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}
