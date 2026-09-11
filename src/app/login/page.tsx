import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const from =
    typeof searchParams.from === "string" ? searchParams.from : "/notebook";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold tracking-tight">
          Sign in to Bench Book
        </h1>
        <div className="mt-1 flex flex-col gap-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          <p>Demo scientist: scientist@benchbook.app / bench-book-demo</p>
          <p>Demo admin: admin@benchbook.app / bench-book-admin</p>
        </div>
        <div className="mt-6">
          <LoginForm redirectTo={from} />
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/register"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Don&rsquo;t have an account? Create one
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Back to Bench Book
          </Link>
        </div>
      </div>
    </div>
  );
}
