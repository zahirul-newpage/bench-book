Bench Book — a voice-dictated lab notebook with a shared reagent inventory, deployed to Cloudflare Workers via Next.js + OpenNext.

## Getting started

Two different local dev modes, depending on what you're touching:

```bash
npm run dev      # plain Next.js dev server — landing page only
npm run preview  # OpenNext build + wrangler dev — everything else
```

Anything that reads D1 (Drizzle), calls Workers AI (Whisper transcription), or otherwise touches `getCloudflareContext()` **throws under `npm run dev`**. That's basically every page except the public landing page. Use `npm run preview` for real work.

Local D1 state lives in `.wrangler/state/v3/d1` — deleting `.wrangler/` (e.g. as part of a build-cache cleanup) wipes the local database. Recover with:

```bash
npx wrangler d1 execute bench-book-db --local --file=./drizzle/migrations/0000_harsh_wasp.sql
npx wrangler d1 execute bench-book-db --local --file=./drizzle/seed.sql
```

`wrangler dev`/`npm run preview` also require an active `wrangler login` session (or `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` in `.env.local`) — Workers AI bindings proxy to **real** Cloudflare inference even in local dev, which incurs small real usage charges. There's no offline/mocked mode for this.

`.env.local` needs `AUTH_SECRET` and `AUTH_TRUST_HOST=true` — Auth.js refuses to trust the host by default outside of dev or a known platform, and this app doesn't run on one.

## What worked locally but needed a real fix for Cloudflare

- **Edge middleware (`proxy.ts`) + Auth.js — removed entirely.** Under OpenNext's Cloudflare adapter, the proxy/middleware execution context perceived every request as HTTPS and looked for a `__Secure-`-prefixed session cookie. The real cookie — set by the main request handler, which correctly saw plain HTTP in local dev — had no such prefix. The proxy silently rejected valid, freshly-issued sessions every time, confirmed by inspecting the mismatched `Set-Cookie` headers on the wrongly-redirected response. This is exactly the class of problem the OpenNext build output warns about ("Node.js middleware support is experimental in Cloudflare... use at your own risk"). **Fix**: page-level guards (`requireSession`/`requireAdmin` in `src/lib/auth/authz.ts`) call `auth()` directly inside each protected Server Component — the same execution context that issued the cookie — so they don't hit the mismatch. There is deliberately no `proxy.ts` in this app; every protected page gates itself.
- **`MediaRecorder`'s built-in `timeslice` chunking doesn't produce independently-decodable audio.** Only the *first* chunk has valid container headers; the rest are headerless continuation data that Whisper (or any decoder) can't read alone. **Fix**: stop the current `MediaRecorder` and immediately start a fresh one on the same live `MediaStream` for each segment — every segment is then a complete, independently valid file, and starting the next one before the previous segment's transcription is even sent means no audio is lost while a request is in flight.
- **Whisper's actual input schema doesn't match what a web search suggests.** Search results pointed at `audio: base64string`, which is the schema for a *different* model (`@cf/openai/whisper-large-v3-turbo`). The model we're actually bound to, `@cf/openai/whisper`, wants `{ audio: number[] }` — the raw bytes as a plain array. Confirmed from Cloudflare's own generated runtime types (`npm run cf-typegen`), not from search. **Lesson**: for Workers AI model schemas, trust `wrangler types` over search results.

## Module compatibility audit

Three modules from typical Node projects that don't run on Workers, and what replaces each:

**bcrypt.** It ships a native (N-API) binding compiled for the Node.js runtime — Workers run on V8 isolates with no native addon loading, no filesystem to load a `.node` binary from, and no libuv. There's no way to `require()` a compiled C++ module at the edge. **Replacement**: the Web Crypto API (`crypto.subtle`), which is a first-class, standardized global on Workers (and in browsers, and in modern Node). This app already does exactly this in `src/lib/auth/password.ts` — PBKDF2 via `crypto.subtle.deriveBits`, salted and stored as `salt:hash`, with a constant-time comparison on verify. It was written this way from the start specifically so auth would work unmodified once deployed here.

**Anything that imports Node's `fs`.** Workers have no local filesystem — no disk to read from or write to, since a Worker isn't a persistent machine, it's a request-scoped isolate that can be evicted at any time. Code that does `fs.readFile`/`fs.writeFile` (config loaders, local caches, image processing libraries that shell out to a temp file) fails immediately since `fs` doesn't exist in the runtime. **Replacement**: object storage. Files that need to persist go in R2 (Cloudflare's S3-compatible bucket storage, reachable via a binding, not a filesystem path); anything that's really just static build output belongs in the `ASSETS` binding OpenNext already wires up for us.

**A long-lived TCP database driver** (raw `pg`, `mysql2`, or an `ioredis`-style client that opens a persistent socket via Node's `net` module). Workers don't support raw TCP sockets at all — the only outbound primitive is `fetch`, and a Worker instance isn't guaranteed to live long enough to hold a connection pool open between requests anyway. A driver built around "open a socket once, reuse it across many queries" has no way to open that socket in the first place. **Replacement**: a database that speaks HTTP instead of a wire protocol over TCP. This app uses D1 (SQLite over the `D1Database` binding, no socket involved) via Drizzle's `drizzle-orm/d1` driver; for Postgres specifically, the equivalent move is something like `@neondatabase/serverless` (HTTP/WebSocket-based) instead of `pg`.

## Questions to ask yourself

**When would you use a Worker instead of a Node.js server?** When the workload is request/response shaped, latency-sensitive, and benefits from running physically close to the user — exactly this app's shape (many benches, one shared reagent count, want every read/write to feel instant regardless of which bench is asking). You would *not* reach for a Worker for something that needs a long-lived process: a persistent WebSocket server juggling in-memory state across requests, a background job that runs for minutes, or anything that assumes a stable filesystem or a kept-open database connection between requests. Durable Objects exist for the "need statefulness across requests, at the edge" case; a plain Worker doesn't give you that by default.

**Why doesn't bcrypt run on Workers, and what replaces it?** Covered above — no native addon loading on V8 isolates; Web Crypto's PBKDF2 replaces it, as already implemented in `password.ts`.

**What is `ctx.waitUntil` for, and what breaks if you forget it?** A Worker's `fetch` handler is allowed to keep doing work *after* the response has been sent back to the client, but only if that work is registered via `ctx.waitUntil(promise)` — it tells the runtime "don't tear down this isolate/request context until this promise settles too." Forget it, and any fire-and-forget async work you kicked off (writing an analytics event, invalidating a cache tag, an audit log write) can simply get cut off mid-flight the moment the response finishes, with no error and no guarantee it ever completes. We haven't called `ctx.waitUntil` directly ourselves — OpenNext's own request handling appears to use it internally for things like populating Next.js's incremental/tag cache in the background (visible in the preview server's own log lines, "Incremental cache does not need populating" / "Tag cache does not need populating") — but every actual write in this app (`db.batch(...)`, `env.AI.run(...)`) is `await`-ed directly in the request path before responding, specifically so we never depend on background work surviving past the response.

**Secrets vs vars in `wrangler.jsonc`: which goes where, and why?** `vars` in `wrangler.jsonc` are plaintext, checked into the repo, visible to anyone who can read the file — fine for things that aren't sensitive (a feature flag default, a public API base URL). `AUTH_SECRET` is not that: it's the key Auth.js uses to encrypt and sign every session token, and anyone who has it can forge a valid session for any user. That has to be set with `wrangler secret put AUTH_SECRET`, which stores it encrypted server-side and never puts it in a file that gets committed. Right now, for local dev, `AUTH_SECRET` and `AUTH_TRUST_HOST` sit in `.env.local` (gitignored, never committed) — the real deploy step still ahead of us is moving `AUTH_SECRET` specifically into a Cloudflare-managed secret via `wrangler secret put`, not a `vars` entry.

**Where does "cold start ≈ 0" actually break down?** "Cold start ≈ 0" is a claim about the *Worker's own JS runtime* spinning up — a V8 isolate starting is genuinely near-instant compared to booting a container or a Node process, since isolates don't need their own OS process or memory space. It says nothing about the *work the Worker then does*. In this app: a Workers AI call (Whisper transcription, or the planned llama-based structuring) is a real inference request to Cloudflare's AI infrastructure — seconds, not milliseconds, regardless of how fast the Worker itself woke up. A D1 query is a real network round trip to SQLite running elsewhere at the edge, not an in-process memory read. The isolate wakes up instantly; what it then has to wait on doesn't.
