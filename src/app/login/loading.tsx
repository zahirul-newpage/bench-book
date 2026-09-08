export default function LoginLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm animate-pulse rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="h-6 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-56 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-6 flex flex-col gap-4">
          <div className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-10 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
