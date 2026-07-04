<div align="center">

# 🚀 Bulk Actions Table

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/JanSzewczyk/bulk-actions-table/actions/workflows/pr-check.yml/badge.svg)](https://github.com/JanSzewczyk/bulk-actions-table/actions/workflows/pr-check.yml)

**A ticket table with bulk actions (Archive / Assign / Delete), a hybrid selection model, and sync→async escalation
for large batches**

[Demo Script](#-demo-script) • [Selection Model](#-selection-model) • [API Contract](#-api-contract) •
[Getting Started](#-getting-started)

</div>

---

## 👋 Overview

This project implements the "bulk actions on a data table" take-home assignment: a support-ticket table (~8,000
seeded rows) with row/page/all-matching selection, three bulk actions with partial-failure handling, and a
sync-for-small/async-job-for-large execution model with live progress and retry. Below is everything the brief
requires — how to run it, the selection model, the API contract, partial-failure behavior, the AI-assisted decisions
made along the way, and what's left for "with more time." The rest of the document (further down) covers the
underlying Next.js/testing/tooling setup.

## 🏁 How to Run

One install, one start:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The ~8,000-ticket dataset is generated deterministically from a
fixed seed on first run, so it's identical across restarts — no database or seed script needed.

**Or, one line with Docker** (no local Node/npm install required at all — the image builds and runs in a container):

```bash
npm run docker:up
```

This is `docker compose up --build` under the hood — it builds the production image and serves it at
[http://localhost:3000](http://localhost:3000). `npm run docker:down` stops and removes it. See
[🚀 Deployment](#-deployment) for the manual `docker build`/`docker run` equivalent.

### Demo script

Five steps to see the whole feature set in one pass. The dataset itself is reproducible (fixed seed, same ~8,000
tickets every restart); the dev panel's default failure rate is non-zero so a large batch reliably produces a few
failures for step 5 to retry — raise it from the Dev panel if you want more (or need a *guaranteed* partial failure
on a small selection):

1. Click the header checkbox to **select the current page** (25 rows). The toolbar appears with a live count.
2. Click **"Select all 8,000 matching"** to escalate the selection to everything matching the current filter, not
   just the loaded page.
3. Click **Delete** — since the count crosses the async threshold, a confirmation dialog appears first (delete is
   always confirmed; any `all`-mode action is confirmed regardless of type). Confirm it.
4. Watch the **progress bar** track the background job (`Running in background… X / 8,000 · Y failed`) — it updates
   roughly every second via polling. Refreshing the page mid-job resumes tracking the same job instead of losing it.
5. When it finishes, the completion toast shows a **"Retry failed (N)"** action. Click it — the failed subset is
   resubmitted, and because the simulated failure is a true independent probability per attempt (not seeded to the
   item), a previously-failed ticket can succeed on retry.

Open the **Dev panel** (⚙️ button, top-right of the page title) to tune the simulated failure rate, latency seed, and
worker concurrency live, without restarting the server — useful for forcing more/fewer partial failures than the
demo script's default.

## 🧩 Selection Model

Row selection is a hybrid of two representations, not a single `Set<id>`:

- **`include`** — an explicit set of picked ids. This is what a plain checkbox list needs, and it's what "select all
  matching" escalates *away* from once the user asks for more than the loaded pages.
- **`all` + `excluded`** — "everything matching the current filter, except these ids." This is the only way to
  represent "select all 8,000 matching" without materializing 8,000 ids client-side, and it's what lets a bulk
  request scale independently of how many rows are visible.

A plain `Set<id>` can't represent "all matching, minus a few" without enumerating every id; a page-scoped selection
can't answer "select all matching" at all. The reducer (`features/tickets/utils/selection.ts`) is pure and framework-free
— a `useReducer` + Context wraps it (`use-selection.ts`) so the selection survives `router.refresh()` and filter/page
navigation without being tied to the query cache.

Behavior across navigation:

| Event                     | `include` mode                          | `all` mode                                    |
| -------------------------- | ---------------------------------------- | ---------------------------------------------- |
| Change page / sort         | Selection untouched (ids persist)        | Selection untouched (scoped to the filter, not the page) |
| Change filter (search/status) | Selection untouched — a toast reports how many picked ids now fall "outside the current filter" | Resets to empty — an `all` selection is only meaningful for the filter it was made under |
| Toggle a row               | Add/remove from the id set                | Add/remove from `excluded`                     |

## 📡 API Contract

Single endpoint for every bulk action, regardless of size:

```
POST /api/tickets/bulk
Idempotency-Key: <uuid>   ← required; a retried submit with the same key returns the original outcome

{ "action": "archive" | "assign" | "unassign" | "delete" | "restore",
  "assigneeId"?: string,               // required when action = "assign"
  "mode": "include", "ids": string[] } |
  "mode": "all", "filter": { q, status }, "excluded": string[] }
```

**Deliberately not in this payload:** `failureRate`, `seed`, and `concurrency`. An earlier draft of the contract
had the caller pass these alongside the request; I moved them server-side instead (`GET`/`PATCH
/api/dev/simulation`, edited from the Dev panel) so a client can influence *what* happens to its own tickets but
never *how reliably* the simulated backend behaves while doing it — the same separation a real deployment would
have between request payloads and ops-only feature flags.

Two response shapes, chosen by the server, not the caller:

- **`200 { succeeded: string[], failed: { id, reason }[] }`** — executed synchronously. Used when `mode: "include"`
  and the id count is below `BULK_ASYNC_THRESHOLD` (default 400).
- **`202 { jobId, status, total }`** — escalated to a background job. Used when `mode: "all"` (size isn't known
  precisely until execution) or the id count meets/exceeds the threshold. Progress is polled via
  `GET /api/jobs/:id` (counters only — `status/total/processed/succeeded/failedCount`, never the failure list itself,
  so a large batch with a high failure rate can't flood the polling client), and the full failed-item list is
  fetched separately and paginated from `GET /api/jobs/:id/failures`.

**The contract is identical whether 200 or 200,000 records are targeted — only the execution mode changes (sync vs.
job).** The production path for this would swap the in-memory `globalThis` store for a persistent store plus a real
queue/worker; the front end wouldn't change at all. The explicit limitation of the current mock: it's a single
Node process (`globalThis` Map), so it doesn't survive a restart or scale across serverless instances — by design,
since a durable store is out of scope for this assignment.

**Dev panel endpoint (`/api/dev/simulation`) is intentionally global and unauthenticated.** It mutates one shared
`failureRate`/`seed`/`concurrency` record used by every request, with no per-session scoping and no auth check. For a
single-evaluator take-home this is the simplest way to make the required failure simulation controllable from the UI;
it would need per-session scoping (or a real auth/rate-limit gate) before this pattern reached a multi-tenant
deployment, since anyone hitting a public URL could otherwise change what every other visitor experiences.

## ⚠️ Partial Failure

A bulk request can partially fail (some ids succeed, some hit a simulated per-item conflict). Rather than a special
"retry" UI, **the selection model itself is the retry mechanism**: succeeded ids are removed from the selection,
failed ids stay selected with an error marker, and a "Retry (N)" action re-submits exactly that failed subset as a
new bulk request. One mechanism handles first-attempt partial failure, manual retry, and even undo-after-delete
(`restore` on the ids that actually got deleted) — no separate code path for any of them.

One nuance: **delete's undo can itself fail.** The undo toast calls the same bulk pipeline with `action: "restore"`
on the deleted ids, which inherits the exact same partial-failure handling — a restore that partially fails leaves
the still-deleted ids selected with their own retry action, rather than silently losing them.

## 🤖 AI Moments

At least two decisions where AI-assisted output was deliberately overridden:

1. **SSE → polling for job progress.** AI-assisted research produced a complete SSE design for streaming job
   progress (coalesced emission on a timer, compact payload). I rejected it in favor of ~1s polling: at that update
   cadence the two are UX-indistinguishable, and polling has natural backpressure — the client decides when to ask,
   so it can't be flooded. Naive per-item SSE (the initial AI proposal) would emit tens of thousands of events/sec at
   this dataset size, each triggering a `setState` — the progress bar meant to improve UX would instead freeze the
   tab. SSE only makes sense with the same coalescing complexity polling already gets for free.
2. **All-async → threshold escalation.** AI defaulted every bulk operation into an async job. I introduced a
   threshold (`BULK_ASYNC_THRESHOLD`, default 400): small operations shouldn't pay job ceremony (an extra round-trip,
   polling, a progress bar for half a second), and large ones can't be synchronous (timeout risk, no feedback while
   waiting). The threshold is a configurable env var, directly answering the brief's question about how the API
   contract should shape execution.
3. **Silent selection-reset on filter change → explicit counter.** AI's default suggestion was to clear the
   selection on every filter change as the "safest" option. For an explicit-id selection, that's hostile to a user
   who manually gathered rows across several pages — instead the selection survives, and the toolbar/confirm dialog
   explicitly show "N outside the current filter." The reset is kept only for `all` mode, where it's semantically
   required (the selection is defined *by* the filter).
4. **TanStack Query → server-first data flow.** AI research recommended TanStack Query with SSR hydration. Since
   table state already lives in the URL, RSC + `useTransition` + `router.refresh()` gives the same practical
   benefits (framework-level caching, a pending state equivalent to `keepPreviousData`, revalidation-after-mutation)
   without a second source of truth for the data. The one real thing given up — prefetching the next page — is
   listed under "with more time" below.

## 🧭 Decisions

The brief is deliberately silent on most of these — each one is a judgment call made for this project, not something
the framework or the brief dictated.

- **Selection is hybrid, not a single `Set<id>`** ([details](#-selection-model)) — the only representation that can
  express both "these specific rows" and "all 8,000 matching, minus a few" without ever materializing 8,000 ids on
  the client.
- **Pessimistic execution, not optimistic.** The mocked API fails randomly and partially — rolling back 7 of 25 rows
  a couple of seconds after an optimistic update reads as a bug, not a feature. The cost is paid back with a per-row
  `pending` state (dimmed row + spinner) so the rest of the table stays interactive and the user still gets immediate
  feedback on *which* rows are in flight.
- **Delete is soft, with a 7-second undo window** (`UNDO_WINDOW_MS`), not an immediate hard delete — it answers the
  brief's "is it recoverable?" question directly, and undo itself is just another bulk request (`action: "restore"`),
  so it inherits partial-failure handling for free instead of needing its own code path.
- **`all`-mode actions always confirm, regardless of action type** — even non-destructive ones like archive or
  assign. A single-row or small `include` selection skips confirmation for non-destructive actions since undoing a
  mistake there is cheap; committing to "everything matching this filter" is not, so that path always states the
  count and the filter it's scoped to before executing.
- **One endpoint, two response shapes, one threshold** ([details](#-api-contract)) — `BULK_ASYNC_THRESHOLD` (default
  400) decides sync vs. background job. The payload is identical either way; only the execution mode changes, so the
  front end doesn't need to know or care which mode it got until it reads the response.
- **Partial failure reuses the selection as the retry queue** ([details](#️-partial-failure)) instead of a separate
  error/retry UI — succeeded ids drop out of the selection, failed ones stay in it with an error marker, and "Retry"
  just resubmits the current selection.
- **Only one bulk job can run at a time.** Bulk actions are disabled while a job is in flight. This is a scope
  decision, not a technical limitation — it keeps client state (one active job, one progress bar) simple, at the cost
  of not letting a user kick off a second unrelated batch while the first is still running.
- **Table state lives in the URL; selection lives in its own client store**, deliberately not in the same place.
  Page/sort/filter are server-owned and get replaced wholesale by `router.refresh()`; selection is user intent that
  must survive that refresh untouched — keeping them separate makes that survival automatic rather than something to
  special-case.
- **An active job id is persisted to `sessionStorage`**, so refreshing the page mid-job resumes polling the same job
  instead of losing track of it — a small addition, but the difference between a progress bar that survives a
  reload and one that silently forgets a running batch.

Two of the above (execution mode escalation, and how selection behaves across filter changes) were also points where
AI-assisted suggestions were deliberately overridden — see [🤖 AI Moments](#-ai-moments) for the fuller before/after
on those two.

## 🔭 With More Time

- **TanStack Query for next-page prefetch and background revalidation** — the one concrete thing given up by the
  server-first approach above.
- **Virtualize the table body** for larger page sizes (100+ rows) — currently fine at the default page sizes, but
  would matter if page size grew significantly.
- **Optimistic updates for single, easily-reversible actions** (e.g. archive on one row) with rollback — not applied
  broadly, since the API fails randomly and partially, and rolling back a chunk of a 25-row bulk request after the
  fact reads as a bug, not a feature.
- **E2E test of the full escalation flow** (Playwright) covering select → escalate → async job → partial failure →
  retry, end to end against a running server.
- **A real queue (e.g. BullMQ) behind the same `POST /api/tickets/bulk` contract** — the contract was designed so
  this swap wouldn't require any front-end change.
- **Test coverage for the async job lifecycle** (`use-job-polling.tsx`, `use-active-job.tsx`) — currently exercised
  manually and by code inspection only. This is the highest-complexity code in the feature (recursive polling, a
  bounded-retry give-up path, `sessionStorage` resume), so it's the best remaining candidate for a dedicated test,
  ahead of anything else on this list.
- **Exercise the `Idempotency-Key` mechanism from the client**, not just implement it server-side — right now every
  submit generates a fresh key, so a genuine transport-level retry (as opposed to a user-triggered "Retry (N)", which
  is deliberately a new request against a smaller subset) never actually replays one. A single automatic retry on a
  network-level failure, reusing the same key, would make the existing server-side idempotency cache do real work
  instead of sitting unexercised.

## 🧪 Tests

The single piece of logic under test is the selection reducer
(`features/tickets/utils/selection.test.ts`) — it's the only logic in this project where a bug is both silent and
destructive (a bulk action running against the wrong set of ids), and the brief itself points at this exact spot
("test the selection logic across pagination"). Cases covered:

- Toggling a row in `include` mode (add/remove) and in `all` mode (moves in/out of `excluded`); reducer never
  mutates its input state.
- Selecting/deselecting an entire page, in both `include` and `all` mode.
- Escalating to `all` mode (discards a prior `include` selection, binds to the current filter with no exclusions).
- Filter changes: resets an `all` selection scoped to a different filter, leaves it untouched when the filter is
  unchanged, and never touches an `include` selection.
- `selectionCount` / `countOutsideFilter` for both modes, including the "never negative" edge case in `all` mode.
- Header checkbox tri-state (`pageCheckboxState`): unchecked / checked / indeterminate / empty-page, including
  `all`-mode exclusions.
- A full end-to-end flow: select page → escalate to all → deselect one → clear.

---

This is **Bulk Actions Table**, built on an enterprise-ready Next.js foundation. The rest of this document covers
the underlying tooling and conventions.

## ✨ Tech Stack

Next.js 16 (App Router, Server Components/Actions, Turbopack, React Compiler) · React 19 · TypeScript (strict) ·
Tailwind CSS 4 + `@szum-tech/design-system` · Zod · Vitest + Storybook + Playwright · Biome (lint/format) · Pino
(structured logging) · T3 Env (type-safe env vars) · `next-themes` · GitHub Actions (CI, CodeQL, semantic-release).
Details on each are further down (env vars, logging, testing, CI) for anyone extending the project.

---

## 📖 Table of Contents

- [🏁 How to Run](#-how-to-run)
- [🧩 Selection Model](#-selection-model)
- [📡 API Contract](#-api-contract)
- [⚠️ Partial Failure](#️-partial-failure)
- [🤖 AI Moments](#-ai-moments)
- [🧭 Decisions](#-decisions)
- [🔭 With More Time](#-with-more-time)
- [🧪 Tests](#-tests)
- [✨ Tech Stack](#-tech-stack)
- [🎯 Getting Started](#-getting-started)
- [🚀 Deployment](#-deployment)
- [📃 Scripts Overview](#-scripts-overview)
- [🧪 Testing](#-testing)
- [🎨 Styling and Design System](#-styling-and-design-system)
- [💻 Environment Variables](#-environment-variables)
- [📝 Logging](#-logging)
- [🤖 GitHub Actions](#-github-actions)
- [🔒 Keeping Server-only Code out of the Client Environment](#-keeping-server-only-code-out-of-the-client-environment)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📧 Contact & Support](#-contact--support)

---

## 🎯 Getting Started

Covered already in [🏁 How to Run](#-how-to-run) above (`npm ci && npm run dev`, or `npm run docker:up` for a
single-command containerized run). Requires Node.js 24.x, npm, and Git.

An optional `.env.local` can override defaults — see [💻 Environment Variables](#-environment-variables)
(`BULK_ASYNC_THRESHOLD`, `LOG_LEVEL`, etc.).

To enable automated releases via [Semantic Release](https://github.com/semantic-release/semantic-release), uncomment
lines 26–30 in `.github/workflows/release.yml`.

---

## 🚀 Deployment

### Deploy with Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the repository
2. Configure environment variables in the Vercel dashboard
3. Deploy — your app will be live in minutes with automatic CI/CD

### Deploy with Docker

Build and run the app as a container with a single command:

```bash
npm run docker:up
```

This uses `docker-compose.yml` to build the production image (multi-stage `Dockerfile`, based on Next.js
[`standalone` output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)) and start it, exposing
the app on [http://localhost:3000](http://localhost:3000).

Other Docker commands:

```bash
npm run docker:build   # Build the image only, without starting a container
npm run docker:down    # Stop and remove the running container
```

Notes:

- The image runs as a non-root user and exposes a container `HEALTHCHECK` against `/api/health`.
- Build-time environment validation ([T3 Env](#-environment-variables)) is skipped via `SKIP_ENV_VALIDATION=true`
  inside the `Dockerfile`; supply real runtime variables to the container (e.g. via `docker-compose.yml`'s
  `environment`/`env_file`, or `docker run --env-file .env.local`).
- To build the image manually without Compose: `docker build -t bulk-actions-table .` then
  `docker run --rm -p 3000:3000 bulk-actions-table`.

---

## 📃 Scripts Overview

### Development

| Script            | Description                                 |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | Start the development server with Turbopack |
| `npm run build`   | Build the app for production                |
| `npm run start`   | Start the production server                 |
| `npm run analyze` | Analyze bundle sizes (Client, Server, Edge) |

### Code Quality

| Script                      | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `npm run biome:check`       | Run Biome check (lint + format)                |
| `npm run biome:ci`          | Run Biome CI check with GitHub reporter        |
| `npm run biome:fix`         | Auto-fix all lint and format issues            |
| `npm run biome:lint`        | Run Biome linter only                          |
| `npm run biome:lint:fix`    | Auto-fix lint issues                           |
| `npm run biome:format`      | Check code formatting                          |
| `npm run biome:format:fix`  | Auto-fix formatting                            |
| `npm run type-check`        | Run TypeScript type checking (`next typegen` + `tsc`) |

### Testing

| Script                            | Description                                   |
| --------------------------------- | --------------------------------------------- |
| `npm run test`                    | Run all Vitest tests                          |
| `npm run test:ci`                 | Run all tests with coverage (CI mode)         |
| `npm run test:coverage`           | Generate full coverage report                 |
| `npm run test:unit`               | Run unit tests only                           |
| `npm run test:unit:coverage`      | Unit tests with separate coverage report      |
| `npm run test:watch`              | Run tests in watch mode                       |
| `npm run test:ui`                 | Vitest UI dashboard                           |
| `npm run test:storybook`          | Storybook component tests with coverage       |
| `npm run test:storybook:coverage` | Storybook tests with separate coverage report |
| `npm run test:e2e`                | Run Playwright E2E tests                      |
| `npm run test:e2e:ui`             | E2E tests with Playwright UI                  |
| `npm run test:e2e:ci`             | E2E tests in CI mode                          |

### Storybook

| Script                    | Description                       |
| ------------------------- | --------------------------------- |
| `npm run storybook:dev`   | Start Storybook (port 6006)       |
| `npm run storybook:build` | Build static Storybook            |
| `npm run storybook:serve` | Serve the built Storybook locally |

### Docker

| Script                  | Description                                           |
| ------------------------ | ------------------------------------------------------ |
| `npm run docker:up`      | Build and start the app with Docker Compose            |
| `npm run docker:down`    | Stop and remove the Docker Compose containers          |
| `npm run docker:build`   | Build the production Docker image without running it   |

---

## 🧪 Testing

This template provides a comprehensive testing infrastructure covering unit, component, and E2E tests.

### 🔬 Unit & Integration Tests

```bash
npm run test
```

Watch mode for active development:

```bash
npm run test:watch
```

Generate a coverage report:

```bash
npm run test:coverage
```

Vitest is configured with two project modes:

- **unit** — Node environment for `*.test.ts` files
- **storybook** — Browser environment (Playwright) for Storybook component tests

### 🎭 End-to-End Tests

```bash
npm run test:e2e
```

Interactive debugging with Playwright UI:

```bash
npm run test:e2e:ui
```

### 📚 Storybook Tests

```bash
npm run test:storybook
```

Storybook tests use `play` functions for interaction testing with accessibility checks via `@storybook/addon-a11y`. Use
the `test-only` tag to exclude stories from docs while keeping them in the test suite.

---

## 🎨 Styling and Design System

This template uses [Tailwind CSS](https://tailwindcss.com/) (CSS-first configuration) alongside the
[Szum-Tech Design System](https://szum-tech-design-system.vercel.app/), which provides:

- ✅ Fully designed, accessible components built on Radix UI
- 🎨 OKLCH semantic color palette and design tokens
- 🛠️ Utility functions and helpers
- 📖 Comprehensive Storybook documentation

### Usage Example

```tsx
import { Button } from "@szum-tech/design-system";

export default function MyComponent() {
  return <Button variant="primary">Click me!</Button>;
}
```

Icons are available from the design system's re-exports:

```tsx
import { GithubIcon, SparklesIcon } from "lucide-react";
```

**[View Design System Documentation →](https://szum-tech-design-system.vercel.app/?path=/docs/components--docs)**

---

## 💻 Environment Variables

[T3 Env](https://env.t3.gg/) provides type-safe environment variable management with build-time validation. Missing or
invalid variables cause a clear error at build time rather than a runtime surprise.

### Configuration

Variables are split into two files in `data/env/`:

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const env = createEnv({
  server: {
    // Server-side variables
    SECRET_KEY: z.string(),
  },
  client: {
    // Client-side variables (must be prefixed with NEXT_PUBLIC_)
    API_URL: z.string().url(),
  },
  runtimeEnv: {
    SECRET_KEY: process.env.SECRET_KEY,
    API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
});
```

- Server variables: `data/env/server.ts`
- Client variables: `data/env/client.ts` (must be prefixed with `NEXT_PUBLIC_`)
- Skip validation: `SKIP_ENV_VALIDATION=true` (useful for Docker builds)

If required variables are missing at build time:

```
❌ Invalid environment variables: { SECRET_KEY: [ 'Required' ] }
```

---

## 📝 Logging

This template uses [Pino](https://getpino.io/), one of the fastest logging libraries for Node.js, with structured JSON
output optimized for Next.js App Router and Turbopack.

### Features

- ✅ **High Performance** — Minimal overhead with fast JSON serialization
- ✅ **Structured Logging** — JSON-formatted logs ready for log aggregation tools (Datadog, ELK, CloudWatch, Grafana
  Loki)
- ✅ **Request Tracking** — Automatic request ID (UUID) via middleware with `X-Request-ID` response header
- ✅ **Universal** — Server-side (Node.js JSON output) and client-side (browser console fallback)
- ✅ **Error Boundaries** — Integrated with `app/error.tsx` and `app/global-error.tsx`
- ✅ **Type-safe** — `LOG_LEVEL` environment variable validated with TypeScript

### Usage

```typescript
import logger, { createLogger } from "~/lib/logger";

// Basic logging
logger.info("User logged in successfully");
logger.warn("API rate limit approaching");
logger.error({ userId: "123", err }, "Failed to fetch user data");

// Context logger — persists context in every log line
const apiLogger = createLogger({ module: "api", service: "user-service" });
apiLogger.info("Processing request");
```

### Log Levels

Control verbosity via the `LOG_LEVEL` environment variable (add to `.env.local`):

```env
LOG_LEVEL=debug
```

Available levels (highest to lowest priority): `fatal` | `error` | `warn` | `info` (default) | `debug` | `trace`

### Built-in Logging

The template automatically logs in these areas:

- **Request middleware** (`proxy.ts`) — every HTTP request logs a `requestId`, method, URL, and user agent on entry.
  Middleware runs *before* the route handler, so it can't observe the real response — status/duration are logged by
  the route handler itself, not the middleware.
- **Health check API** (`app/api/health/route.ts`) — logs each health probe at `debug` (hit every few seconds by
  container/uptime probes — `info` would drown real logs in noise)
- **Error boundaries** (`app/error.tsx`, `app/global-error.tsx`) — logs caught errors with full stack traces

### Production Best Practices

```typescript
// Include context objects for searchability
logger.error({ userId, orderId, err }, "Order processing failed");

// Never log sensitive data
logger.info({ userId: user.id }, "User login"); // ✅
logger.info({ password: user.password }, "User login"); // ❌

// Pass Error objects under the `err` key, not `error` — Pino's default serializer only recognizes
// `err` and expands it to { type, message, stack }. Any other key holding a raw Error serializes to `{}`.
try {
  // ...
} catch (err) {
  logger.error({ err }, "Operation failed"); // ✅
  logger.error({ error: err }, "Operation failed"); // ❌ — logs `"error":{}`
}
```

---

## 🤖 GitHub Actions

Three pre-configured workflows automate quality checks and releases:

### ✅ PR Check (`pr-check.yml`)

[![CI](https://github.com/JanSzewczyk/bulk-actions-table/actions/workflows/pr-check.yml/badge.svg)](https://github.com/JanSzewczyk/bulk-actions-table/actions/workflows/pr-check.yml)

Runs on every pull request and validates:

- Build — ensures the project compiles successfully
- Storybook build — validates Storybook compilation
- Biome — linting and formatting check with GitHub inline annotations
- TypeScript — type checking
- Vitest unit tests with coverage
- Storybook interaction tests with coverage
- Merged coverage comment on PR
- Playwright E2E tests
- Dependency review — security audit of dependency changes

### 🔒 CodeQL (`codeql.yml`)

[![CodeQL](https://github.com/JanSzewczyk/bulk-actions-table/actions/workflows/codeql.yml/badge.svg)](https://github.com/JanSzewczyk/bulk-actions-table/actions/workflows/codeql.yml)

Automated security scanning powered by GitHub CodeQL, running on push and schedule.

### 🚀 Release (`release.yml`)

Triggers automatically when changes are merged to `main`:

- Determines the next version using [Semantic Release](https://github.com/semantic-release/semantic-release)
- Updates `CHANGELOG.md`
- Creates a GitHub Release with release notes
- Bumps version in `package.json`

Based on [Conventional Commits](https://www.conventionalcommits.org/) via `@szum-tech/semantic-release-config`.

---

## 🔒 Keeping Server-only Code out of the Client Environment

JavaScript modules can be shared between Server and Client Components, making it possible for server-only code to
accidentally end up in the client bundle.

### Solution: `server-only` Package

Use the [server-only](https://www.npmjs.com/package/server-only) package to get a build-time error if server code is
ever imported in a Client Component:

```bash
npm install server-only
```

Import it at the top of any module that must stay on the server:

```typescript
import "server-only";

export async function getData() {
  // This function can only be used on the server
}
```

Any Client Component that imports this module will fail the build — catching the mistake before it reaches production.

---

## 📁 Project Structure

```
bulk-actions-table/
├── .claude/              # Claude Code configuration (agents, skills, hooks)
├── .github/
│   └── workflows/        # GitHub Actions workflows (CI/CD)
├── .storybook/           # Storybook configuration and themes
├── app/                  # Next.js App Router (pages, layouts, API routes)
├── components/           # Reusable React components with co-located stories
├── constants/            # Static data and configuration constants
├── data/
│   └── env/              # T3 Env type-safe environment variable definitions
├── features/             # Feature-based modules (components, schemas, server)
├── lib/                  # Utility functions and configurations (logger)
├── public/               # Static assets (images, icons, SVGs)
├── stories/              # Standalone Storybook stories
├── tests/
│   ├── e2e/              # Playwright end-to-end tests
│   ├── integration/      # Storybook integration test setup
│   └── unit/             # Vitest unit tests
├── types/                # Global TypeScript type declarations
├── utils/                # Shared utility functions
├── biome.json            # Biome linter and formatter configuration
├── docker-compose.yml    # Single-command Docker build and run
├── Dockerfile            # Multi-stage production Docker image
├── next.config.ts        # Next.js configuration
├── playwright.config.ts  # Playwright E2E test configuration
├── postcss.config.js     # PostCSS and Tailwind CSS configuration
├── proxy.ts              # Request logging middleware
├── release.config.js     # Semantic Release configuration
├── tsconfig.json         # TypeScript compiler options and path aliases
└── vitest.config.ts      # Vitest test configuration
```

### Key Directories

- **`.claude/`** — Claude Code configuration (agents, skills, hooks, project context)
- **`.github/workflows/`** — CI/CD automation (PR checks, CodeQL, releases)
- **`.storybook/`** — Storybook setup for component development and documentation
- **`app/`** — Next.js App Router with Server/Client Components, layouts, and API routes
- **`components/`** — Shared, reusable UI components with co-located Storybook stories
- **`data/env/`** — T3 Env type-safe environment variable definitions (server + client)
- **`features/`** — Feature-based modules with related components, Zod schemas, and server actions
- **`lib/`** — Utilities, helpers, and third-party library configurations (logger)
- **`tests/`** — Test files organized by type: unit (Vitest), integration (Storybook), and E2E (Playwright)

### Important Configuration Files

- **`biome.json`** — Biome linter and formatter rules (replaces ESLint + Prettier)
- **`Dockerfile`** / **`docker-compose.yml`** — Multi-stage production Docker image and single-command run/build
  ([details](#-deployment))
- **`next.config.ts`** — Next.js config (React Compiler, bundle analyzer, health rewrites, standalone output)
- **`playwright.config.ts`** — Playwright E2E test configuration
- **`postcss.config.js`** — PostCSS plugins and Tailwind CSS processing
- **`tsconfig.json`** — TypeScript compiler options including `~/` path alias
- **`vitest.config.ts`** — Vitest configuration with `unit` and `storybook` project modes

---

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute to this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure your code passes all tests and follows the project's coding standards.

---

## 📜 License

This project is licensed under the **MIT License**. For more information, see the [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

This project is built with amazing tools and libraries from the open-source community:

- [Next.js](https://nextjs.org/) - The React Framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) - JavaScript with syntax for types
- [Vitest](https://vitest.dev/) - Next generation testing framework
- [Playwright](https://playwright.dev/) - E2E testing framework
- [Storybook](https://storybook.js.org/) - UI component explorer
- And many more amazing libraries!

---

## 📧 Contact & Support

If you have any questions, suggestions, or issues:

- 🐛 [Open an issue](https://github.com/JanSzewczyk/bulk-actions-table/issues)
- ⭐ [Star this repository](https://github.com/JanSzewczyk/bulk-actions-table)
- 👨‍💻 Check out my [GitHub profile](https://github.com/JanSzewczyk)

---

<div align="center">

**Made with ❤️ by [JanSzewczyk](https://github.com/JanSzewczyk)**

[⬆ Back to Top](#-bulk-actions-table)

</div>
