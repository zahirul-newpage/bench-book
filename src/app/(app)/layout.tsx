import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/notebook" className="text-lg font-semibold tracking-tight">
            Bench Book
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/notebook" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Notebook
            </Link>
            <Link href="/inventory" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Inventory
            </Link>
            {session?.user?.role === "admin" && (
              <Link href="/admin" className="hover:text-zinc-900 dark:hover:text-zinc-50">
                Admin
              </Link>
            )}
            <Link
              href="/notebook/new"
              className="rounded-full bg-zinc-900 px-4 py-1.5 font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              New entry
            </Link>
            {session?.user?.email && (
              <form
                className="flex items-center"
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <span className="mr-3">{session.user.email}</span>
                <button
                  type="submit"
                  className="hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Sign out
                </button>
              </form>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
