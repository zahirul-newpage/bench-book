import Link from "next/link";
import { auth, signOut } from "@/auth";

const steps = [
  {
    label: "Dictate",
    title: "Talk through the experiment as you run it",
    body: "No stopping to type or write with gloved hands. Just say what you're doing — reagents, amounts, timing — as it happens at the bench.",
  },
  {
    label: "Structure",
    title: "AI turns speech into a clean notebook entry",
    body: "Steps and reagents are separated out, units and names are normalized, and the entry is organized in order — not a wall of raw transcript.",
  },
  {
    label: "Sync",
    title: "Shared reagent stock updates in real time",
    body: "Every reagent used is deducted from a communal inventory instantly, so every bench sees accurate stock — no separate logging, no surprises.",
  },
];

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-zinc-50/90 backdrop-blur dark:border-zinc-800/80 dark:bg-black/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Bench Book
          </Link>
          <nav className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <a
              href="#how-it-works"
              className="hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              How it works
            </a>
            <a
              href="#example"
              className="hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Example
            </a>
            {session?.user?.email ? (
              <>
                <Link
                  href="/notebook"
                  className="hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Notebook
                </Link>
                <form
                  className="flex items-center gap-3"
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <span className="hidden sm:inline">
                    {session.user.email}
                  </span>
                  <button
                    type="submit"
                    className="hover:text-zinc-900 dark:hover:text-zinc-50"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                Sign in
              </Link>
            )}
            <a
              href="#early-access"
              className="rounded-full bg-zinc-900 px-4 py-2 font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Request early access
            </a>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-24 text-center sm:py-32">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            For lab scientists, at the bench
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Say it. We&rsquo;ll write it up.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Bench Book listens while you work, turns your dictation into a
            structured protocol entry, and keeps your lab&rsquo;s shared
            reagent inventory accurate — automatically.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#how-it-works"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              See how it works
            </a>
            <a
              href="#early-access"
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Request early access
            </a>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-t border-zinc-200/80 bg-white px-6 py-24 dark:border-zinc-800/80 dark:bg-zinc-950"
        >
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              How it works
            </h2>
            <div className="mt-16 grid gap-10 sm:grid-cols-3">
              {steps.map((step, i) => (
                <div key={step.label} className="flex flex-col">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
                    {i + 1}
                  </div>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {step.label}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="example"
          className="border-t border-zinc-200/80 px-6 py-24 dark:border-zinc-800/80"
        >
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              From spoken word to structured record
            </h2>
            <div className="mt-16 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  What you say
                </p>
                <p className="mt-4 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                  &ldquo;Adding 5 mL of Tris buffer, pH 7.4, incubating at 37
                  degrees for 20 minutes. Then spinning down the sample at
                  3000 RPM for 5 minutes.&rdquo;
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  What gets recorded
                </p>
                <ol className="mt-4 space-y-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  <li>1. Add Tris buffer, pH 7.4 — 5 mL</li>
                  <li>2. Incubate — 37°C, 20 min</li>
                  <li>3. Centrifuge — 3000 RPM, 5 min</li>
                </ol>
                <div className="mt-6 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
                  <p className="font-medium">Reagents used</p>
                  <p className="mt-1 flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Tris buffer, pH 7.4</span>
                    <span>&minus; 5 mL</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="early-access"
          className="border-t border-zinc-200/80 bg-white px-6 py-24 dark:border-zinc-800/80 dark:bg-zinc-950"
        >
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              Bring Bench Book to your lab
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              We&rsquo;re building Bench Book with early lab partners. Reach
              out to get your bench set up.
            </p>
            <a
              href="mailto:hello@benchbook.app"
              className="mt-8 rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              hello@benchbook.app
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200/80 px-6 py-8 dark:border-zinc-800/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>&copy; {new Date().getFullYear()} Bench Book</span>
          <span>Built for scientists, at the bench.</span>
        </div>
      </footer>
    </div>
  );
}
