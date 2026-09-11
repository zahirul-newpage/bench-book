import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/logo";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950">
        {/*
          The logo is the one item forced onto its own full-width, centered
          row below `sm` (`basis-full justify-center`) — the same "give one
          item its own row on mobile" trick used for the reagent-row aliases
          field. From `sm:` up it sits inline at the start, logo-left /
          nav-right, same as before.
        */}
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 py-4 sm:justify-between sm:py-4 sm:px-6">
          <div className="order-1 basis-full justify-center sm:order-none sm:basis-auto sm:justify-start flex">
            <Logo href="/notebook" />
          </div>
          <nav className="order-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-zinc-600 sm:order-none sm:justify-start sm:gap-x-4 dark:text-zinc-400">
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
              className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-1.5 font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New
            </Link>
            {session?.user?.email && (
              <form
                className="flex items-center"
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                {/* Email is the one item that can genuinely push this row past
                    a phone's width, so it's the one that drops first — same
                    pattern the landing page header already uses. */}
                <span className="mr-3 hidden md:inline">
                  {session.user.email}
                </span>
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
