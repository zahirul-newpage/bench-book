# Engineering notes

The retrospective, module-compatibility audit, security hardening writeup,
secret-rotation drill, and EdgeLedger comparison for Bench Book. See the main
[README](../README.md) for the project overview and setup instructions.

## What worked locally but needed a real fix for Cloudflare

- **Edge middleware (`proxy.ts`) + Auth.js — removed entirely.** Under OpenNext's Cloudflare adapter, the proxy/middleware execution context perceived every request as HTTPS and looked for a `__Secure-`-prefixed session cookie. The real cookie — set by the main request handler, which correctly saw plain HTTP in local dev — had no such prefix. The proxy silently rejected valid, freshly-issued sessions every time, confirmed by inspecting the mismatched `Set-Cookie` headers on the wrongly-redirected response. This is exactly the class of problem the OpenNext build output warns about ("Node.js middleware support is experimental in Cloudflare... use at your own risk"). **Fix**: page-level guards (`requireSession`/`requireAdmin` in `src/lib/auth/authz.ts`) call `auth()` directly inside each protected Server Component — the same execution context that issued the cookie — so they don't hit the mismatch. There is deliberately no `proxy.ts` in this app; every protected page gates itself.
- **`MediaRecorder`'s built-in `timeslice` chunking doesn't produce independently-decodable audio.** Only the *first* chunk has valid container headers; the rest are headerless continuation data that Whisper (or any decoder) can't read alone. **Fix**: stop the current `MediaRecorder` and immediately start a fresh one on the same live `MediaStream` for each segment — every segment is then a complete, independently valid file, and starting the next one before the previous segment's transcription is even sent means no audio is lost while a request is in flight.
- **Whisper's actual input schema doesn't match what a web search suggests.** Search results pointed at `audio: base64string`, which is the schema for a *different* model (`@cf/openai/whisper-large-v3-turbo`). The model we're actually bound to, `@cf/openai/whisper`, wants `{ audio: number[] }` — the raw bytes as a plain array. Confirmed from Cloudflare's own generated runtime types (`npm run cf-typegen`), not from search. **Lesson**: for Workers AI model schemas, trust `wrangler types` over search results.

## Module compatibility audit

Three modules from typical Node projects that don't run on Workers, and what replaces each:

**bcrypt.** It ships a native (N-API) binding compiled for the Node.js runtime — Workers run on V8 isolates with no native addon loading, no filesystem to load a `.node` binary from, and no libuv. There's no way to `require()` a compiled C++ module at the edge. **Replacement**: the Web Crypto API (`crypto.subtle`), which is a first-class, standardized global on Workers (and in browsers, and in modern Node). This app already does exactly this in `src/lib/auth/password.ts` — PBKDF2 via `crypto.subtle.deriveBits`, salted and stored as `salt:hash`, with a constant-time comparison on verify.

**Anything that imports Node's `fs`.** Workers have no local filesystem — no disk to read from or write to, since a Worker isn't a persistent machine, it's a request-scoped isolate that can be evicted at any time. **Replacement**: object storage. Files that need to persist go in R2 (S3-compatible, reachable via a binding, not a filesystem path); static build output belongs in the `ASSETS` binding OpenNext already wires up.

**A long-lived TCP database driver** (raw `pg`, `mysql2`, or an `ioredis`-style client opening a persistent socket via Node's `net` module). Workers don't support raw TCP sockets — the only outbound primitive is `fetch`. **Replacement**: a database that speaks HTTP instead of a wire protocol. This app uses D1 (SQLite over the `D1Database` binding) via Drizzle's `drizzle-orm/d1` driver.

## Protecting the app

- **Structured `[AUDIT]` logging** (`src/lib/audit.ts`) — one JSON line per mutation (entry creation, reagent stock updates, registration, login), actor/action/target/outcome. Verified live: `wrangler tail` while exercising the app produces genuinely parseable JSON, confirmed by piping it into `json.loads`, not just eyeballing it.
- **Rate limiting** on `/register` (3/60s), login (5/60s), and `/api/transcribe` (10/60s, keyed by user id since it costs real money per call) via `wrangler.jsonc`'s `unsafe.bindings`. **Real finding**: the limit is approximate, not exact — testing the register limiter let 4 requests through before the 5th was rejected. Cloudflare's docs describe the `simple` algorithm as approximate. Pick limits with that slop in mind.
- **Turnstile** (`src/lib/turnstile.ts`, `src/components/turnstile-widget.tsx`, wired into `/register`) is active in both local dev and production: the sitekey lives in `wrangler.jsonc`'s `vars` (public, safe to commit) and reads locally from a gitignored `.dev.vars`; the secret key is set via `wrangler secret put TURNSTILE_SECRET_KEY` in production and also lives in `.dev.vars` for local dev. Verified live: a registration POST with no real Turnstile token gets rejected server-side ("verification failed"), and confirmed 0 rows written to `users` for that attempt — not just that the widget renders.
- **AI Gateway**: not wired in — the token available for setup lacked AI Gateway permission scope (confirmed via a real `401`, not assumed).

### The secret-rotation drill (run against production, not simulated)

`AUTH_SECRET` is what Auth.js uses to sign and decrypt every session JWT. `src/auth.ts` reads it as **two Cloudflare secret names** — `AUTH_SECRET` (current) and `AUTH_SECRET_PREVIOUS` (only set during a rotation window) — and tries each in order.

1. **Wrong way**: rotated `AUTH_SECRET` directly, no dual-key window. An existing session (C1) immediately went from valid to `null` — no warning, no grace period, took effect on the very next request.
2. **Right way**: set `AUTH_SECRET_PREVIOUS` to the old value first, then rotated `AUTH_SECRET` to a new one. The existing session (C2) kept working; a new login (C3) got signed with the new secret. Both live at once.
3. **Retire**: deleted `AUTH_SECRET_PREVIOUS`. C2 didn't die immediately — it took ~20 seconds to become invalid. **Real finding**: secret *update* is visible on the next request, but secret *deletion* has a real propagation delay across Cloudflare's edge network.

## Notes to review — what surprised us, what we got wrong, what we'd do differently

**A simplified prompt silently dropped guarantees we'd already earned.** After tuning the structuring prompt for completeness and anti-hallucination ("extract EVERY step," "use ONLY what was said"), a later request to make the prompt "as simple as possible" removed those lines along with the verbosity — because they read as verbosity, not as guarantees. Nothing failed loudly; the model just quietly got a little less complete. Lesson: when trimming an LLM prompt, every remaining line should earn its place on its own.

**Two different reagent-matching bugs, in opposite directions — both silent.** First: an "unambiguous prefix match" (so "Tris buffer" would find "Tris buffer, pH 7.4") silently matched a *different* pH (7.5) to the stocked 7.4 item. Second: letting the LLM propose which inventory item a mention referred to, then only checking that the proposed name *existed* — the model mapped "protein stock" to "Pfizer" (unrelated), and the code accepted it because "Pfizer" was a real name. A synonym and a hallucination can share zero tokens; no string heuristic tells them apart. Fix: aliases are admin-curated data, never model-inferred.

**We told ourselves something false, and initially believed it.** A report claimed "0 disagreements" logged during testing, based on `grep`-ing a terminal log that came up empty. This version of `wrangler dev` routes `console.*` output through a queryable local API, not to captured stdout. The real query showed disagreements *had* occurred. An empty log is not evidence until you've confirmed the log itself is actually being captured.

**A hardcoded token budget, and a retry that couldn't have helped.** `max_tokens: 1536` truncated the LLM's response on a large dictation, and the retry used the *same* cap — failing identically twice and falling back to a cruder regex parser. Fixed by reading the model's `finish_reason` to detect truncation specifically, and only escalating the token budget on a retry that was actually truncated.

**Wrapping OpenNext's generated Worker to add a queue consumer wasn't obvious.** OpenNext's `.open-next/worker.js` only exports a `fetch` handler. Fixed with a small `worker-entry.ts` wrapper — which surfaced its own build-ordering bug: `next build`'s TypeScript pass tried to check that wrapper, which imports a file that doesn't exist until a later build step. Excluded the wrapper from Next's tsconfig.

**A near-miss double-deduction bug, caught by testing the failure path on purpose.** The queue consumer originally wrote its "success" log row inside the same `try` block as the stock update. If that log write failed right after a successful deduction, the surrounding `catch` would have retried — deducting the same amount twice. Fixed by giving the log write its own `catch` that can never escalate into a retry of an already-applied deduction.

**Migration tooling needed a manual workaround.** Renaming a column with new enum values required `drizzle-kit generate` to ask an interactive rename-vs-add question, and this environment has no TTY to answer it. Since the table was verified empty, the migration SQL and its snapshot metadata were written by hand, then checked by re-running `generate` and confirming no further changes.

**A `tsconfig.json` `exclude` entry that silently didn't work, discovered by accident.** `worker-entry.ts` was excluded from the TypeScript project specifically because `next build`'s own typecheck can't resolve `.open-next/worker.js` (it doesn't exist until a later build step). This appeared to work for weeks. It didn't: `next build` failed on exactly that file the first time `npm run build` ran with no leftover `.open-next/` directory sitting around from a previous `npm run preview`. `tsc --explainFiles` showed why — the file was still being matched by the `**/*.ts` include pattern and pulled in as a real root file, `exclude` notwithstanding, for reasons that didn't reproduce the same way through the TypeScript compiler API directly. The actual fix looks almost too simple by comparison: `@ts-ignore` on the two import lines (not `@ts-expect-error`, which itself flips between correct and "unused directive" depending on whether the target file happens to exist), with a scoped eslint-disable for the lint rule that specifically discourages `@ts-ignore`. The lesson isn't really about TypeScript's file-inclusion algorithm — it's that a config change that "worked" in ad hoc testing had never actually been tested against the state it needed to handle (a clean checkout, or any build sequence where a stale artifact wasn't quietly hiding the gap).

**KV's eventual consistency, discovered by watching real behavior instead of trusting the code.** The queue consumer correctly invalidates the cache immediately after a successful deduction. Stock still showed stale on `/inventory` for up to a minute afterward — Cloudflare KV writes can take up to 60 seconds to propagate to every edge location. This is the one open item from this build: for data that needs to be trusted immediately after an action, cache-aside KV in front of D1 may be the wrong tool at this app's scale.

**What we'd do differently.** Design the stock-deduction task lifecycle (queued → in_progress → success/failed) from the start instead of retrofitting it after shipping a fire-and-forget deduction. Treat "the LLM extracts data" and "the code decides what to trust from it" as two separate layers from day one. Default to no cache for low-traffic, correctness-sensitive admin data, adding one only after seeing real load.

## Comparing notes with EdgeLedger

EdgeLedger (`reference/`) solves several of the same problems this app does — queues, D1, rate limiting, Turnstile, Web-Crypto password hashing, structured audit logging — but arrived at different, and in places more thorough, answers.

**One Worker vs. five.** Bench Book is a single Worker wrapped by `worker-entry.ts` to also handle the queue consumer. EdgeLedger splits into five Workers connected by service bindings — a frontend, a Durable-Object write coordinator, a standalone AI worker, a queue consumer, and a Workflows worker. Ours is simpler to reason about; theirs lets each piece scale and fail independently, and its AI worker is reusable across two different frontends.

**No dead-letter queue — a gap worth closing.** EdgeLedger's consumer is configured with a `dead_letter_queue`. Bench Book has `max_retries: 3` and nothing beyond that — a deduction that exhausts retries is marked `"failed"` and the message is gone, with no durable holding queue to replay from.

**No idempotency key — a real correctness gap.** EdgeLedger's Durable Object write path accepts an `idempotencyKey` cached in DO storage with `alarm()`-driven cleanup, so a retried request provably can't double-apply. Bench Book's near-miss double-deduction bug (above) was caught by careful code structure, not by an idempotency check that would catch *every* possible double-delivery — including one caused by the Worker being killed between the D1 update and `message.ack()`.

**Durable Objects and Workflows: not used here at all.** EdgeLedger uses a DO as its write coordinator and Workflows for its durable monthly-statement pipeline. Bench Book's D1 batch plays the DO's "atomic write" role and the Queue plays the Workflow's "survive past the request" role, without the stronger guarantees those primitives provide. Reasonable at this app's scale (one shared inventory); wouldn't be at EdgeLedger's.

**Auth: session-based role check vs. SSO.** Bench Book's admin gate reads a role out of a self-issued Auth.js session. EdgeLedger puts `/admin/*` behind Cloudflare Access (SSO) and verifies the resulting JWT — a materially stronger trust model.

## Questions to ask yourself

**When would you use a Worker instead of a Node.js server?** When the workload is request/response shaped, latency-sensitive, and benefits from running close to the user — this app's shape exactly. Not for something needing a long-lived process (a persistent WebSocket server, a minutes-long background job, a kept-open DB connection). Durable Objects exist for "needs statefulness across requests, at the edge"; a plain Worker doesn't give you that by default.

**What is `ctx.waitUntil` for, and what breaks if you forget it?** A Worker's `fetch` handler can keep doing work after the response is sent, but only if registered via `ctx.waitUntil(promise)` — otherwise fire-and-forget async work can be cut off mid-flight with no error. This app doesn't call it directly: every write (`db.batch(...)`, `env.AI.run(...)`) is `await`-ed before responding, so nothing depends on background work surviving past the response.

**Secrets vs vars in `wrangler.jsonc`: which goes where, and why?** `vars` are plaintext, committed, visible to anyone reading the file — fine for non-sensitive values (`AUTH_TRUST_HOST`, a public Turnstile sitekey). `AUTH_SECRET` is set via `wrangler secret put`, encrypted server-side, never committed — because anyone with it can forge a valid session for any user.

**Where does "cold start ≈ 0" actually break down?** It's a claim about the Worker's own JS runtime spinning up, not about the work the Worker then does. A Workers AI call is a real inference request (seconds); a D1 query is a real network round trip. The isolate wakes up instantly — what it then waits on doesn't.

**Could you trace every change to a record from logs alone?** Yes, for the mutations that matter — `wrangler tail | grep AUDIT` returns one parseable JSON line per entry creation, stock change, registration, and login, with actor/action/target/outcome. It would not catch a raw D1 edit made outside the app, or anything from before audit logging was added.
