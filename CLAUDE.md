# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bulk Actions Table is a Next.js 16.2.9 application with React 19.2.7, TypeScript 6.0, Tailwind CSS 4.3.2, React
Compiler, and comprehensive testing infrastructure (Vitest 4.1, Playwright 1.61).

## Commands

### Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
```

### Docker

```bash
npm run docker:up     # Build and run the app in a container (docker compose up --build)
npm run docker:down   # Stop and remove the container
npm run docker:build  # Build the production image only
```

### Code Quality

```bash
npm run biome:check      # Biome check (lint + format)
npm run biome:ci         # Biome check with GitHub reporter (CI mode)
npm run biome:fix        # Auto-fix all lint and format issues
npm run biome:lint       # Biome lint only
npm run biome:lint:fix   # Auto-fix lint issues
npm run biome:format     # Check formatting only
npm run biome:format:fix # Auto-fix formatting
npm run type-check       # TypeScript type checking (next typegen + tsc)
```

### Testing

```bash
npm run test                    # Run all Vitest tests
npm run test:unit               # Unit tests only
npm run test:unit:coverage      # Unit tests with coverage report
npm run test:storybook          # Storybook component tests with coverage
npm run test:storybook:coverage # Storybook tests with separate coverage report
npm run test:coverage           # Full coverage report
npm run test:ci                 # All tests with coverage (CI mode)
npm run test:watch              # Watch mode
npm run test:ui                 # Vitest UI

# Run a single test file
npx vitest run path/to/file.test.ts
npx vitest run --project=unit path/to/file.test.ts

# E2E tests (Playwright) - requires build first
npm run build && npm run test:e2e
npm run test:e2e:ui             # Playwright UI mode
npm run test:e2e:ci             # E2E tests in CI mode
```

### Storybook

```bash
npm run storybook:dev         # Start Storybook (port 6006)
npm run storybook:build       # Build static Storybook
```

### Analysis

```bash
npm run analyze               # Bundle analyzer
```

## Architecture

### Tech Stack

- **Next.js**: 16.2.9 (App Router, Turbopack, React Compiler)
- **React**: 19.2.7 with React Compiler enabled
- **TypeScript**: 6.0.3 (strict mode)
- **Tailwind CSS**: 4.3.2 (CSS-first config)
- **Biome**: 2.5.1 (lint + format)
- **@szum-tech/design-system**: 3.21.9
- **Vitest**: 4.1.8 (unit & integration tests)
- **Playwright**: 1.61.1 (E2E tests)
- **Storybook**: 10.4.1 (component development)
- **Zod**: 4.3.6 (validation)
- **Pino**: 10.3.0 (logging)
- **next-themes**: 0.4.6 (theming)

### Path Aliases

Use `~/` prefix for absolute imports (configured in tsconfig.json):

```typescript
import logger from "~/lib/logger";
import { env } from "~/data/env/server";
```

### Key Directories

- **app/**: Next.js App Router pages, layouts, and API routes
- **features/**: Feature-based modules (see structure below)
- **components/**: Shared reusable components (ui/, providers/)
- **lib/**: Cross-feature server infrastructure — `logger.ts` (Pino), `api/http-client.ts` (shared server-only fetch
  client every feature's `server/api` builds on), `services/errors.ts` (the `ServiceError`/`ServiceResult` tuple
  contract), `action-types.ts` (`ActionResponse` discriminated union)
- **data/env/**: T3 Env type-safe environment variables (server.ts, client.ts)
- **constants/**: Static data and configuration constants
- **tests/e2e/**: Playwright E2E tests (\*.e2e.ts pattern)
- **tests/unit/**: Vitest unit tests (\*.test.ts pattern)
- **tests/integration/**: Storybook integration tests

### Feature Module Structure

Features follow a modular architecture pattern:

```
features/
└── example-feature/
    ├── components/    # Feature-specific components
    ├── constants/      # Feature-scoped constants (client-safe)
    ├── context/        # React Context wrapping a lib/ reducer (when selection/UI state must survive navigation)
    ├── hooks/          # Client hooks (selection state, job polling, etc.)
    ├── lib/            # Pure client-safe logic (e.g. a reducer) — some features instead name this utils/
    ├── schemas/        # Zod validation schemas
    ├── server/
    │   ├── actions/    # Server actions — call server/api only, never db/services directly
    │   ├── api/        # Fetch client for this feature's own route handlers → ServiceResult<T> tuples
    │   ├── db/         # Storage layer (in-memory `globalThis` store, or a real DB)
    │   └── services/   # Business logic behind the route handlers; only route handlers import this
    ├── test/builders/  # mimicry-js + faker test data builders
    └── types/          # Shared types safe for both server and client
```

`context/` and the `lib/`-vs-`utils/` naming aren't fixed — check the feature's actual folder before assuming one.

The browser never calls the feature's own API routes directly — reads go `RSC → server/api (fetch) → route handler
→ service → db`, and mutations go `client → server action → server/api (fetch) → route handler → service → db`.
Actions/pages only ever import `server/api`; route handlers only ever import `services`.

### Tickets Feature (Bulk Actions Table)

`features/tickets/` is the concrete example of the structure above — a ~8,000-row ticket table with a hybrid
selection model (`include` ids-set ⇄ `all` filter+excluded, in `utils/selection.ts`, unit-tested), three bulk actions
with partial-failure retry, and a sync/async-job execution split (`BULK_ASYNC_THRESHOLD` in `data/env/server.ts`,
default 400). It uses `utils/` (not `lib/`) for the reducer and adds a `context/selection.context.tsx` that wraps it
so selection survives `router.refresh()` and page/filter navigation. See the README's dedicated sections (Selection
Model, API Contract, Partial Failure) for the full contract — this file only tracks pitfalls specific to building on
it.

### Environment Variables

Environment variables are validated at build-time using T3 Env:

- Server variables: `data/env/server.ts`
- Client variables: `data/env/client.ts` (must be prefixed with `NEXT_PUBLIC_`)
- Skip validation with `SKIP_ENV_VALIDATION=true`

### Logging

Uses Pino logger (`lib/logger.ts`). Create child loggers with context:

```typescript
import logger, { createLogger } from "~/lib/logger";
const apiLogger = createLogger({ module: "api" });
```

Request logging is handled automatically via `proxy.ts` with request ID tracking.

### Testing Configuration

Vitest 4.1 is configured with two project modes:

- **unit**: Node environment for unit tests (`*.test.ts` files)
- **storybook**: Browser environment (Playwright) for Storybook component tests

Storybook tests use play functions for interaction testing with accessibility checks via @storybook/addon-a11y.
Use `test-only` tag for stories that should be excluded from docs but run in tests.

### Design System

Uses `@szum-tech/design-system` package. Import components directly:

```typescript
import { Button, Card, Tooltip } from "@szum-tech/design-system";
```

Icons are re-exported via the design system:

```typescript
import { GithubIcon, SparklesIcon } from "lucide-react";
```

### Health Checks

Built-in health endpoint at `/api/health` with multiple URL aliases: `/healthz`, `/api/healthz`, `/health`, `/ping`

### Theme Support

The app uses `next-themes` for dark/light/system theme switching:

- `ThemeProvider` wraps the app in `app/layout.tsx`
- `ThemeToggle` component for user switching
- Theme is persisted in localStorage

### Next.js Configuration

- React Compiler enabled (`reactCompiler: true`)
- Pino externalized for server-side logging
- Bundle analysis via `npm run analyze` (Next's built-in `next experimental-analyze` — no env var to set)
- `output: "standalone"` — required for the production `Dockerfile`

## Conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) for semantic release
- Linting & formatting: Biome (`biome.json`)
- Semantic Release: Uses `@szum-tech/semantic-release-config`

## Common Pitfalls

| Area                  | Don't                                                                                     | Do                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Components            | Add `'use client'` unnecessarily                                                          | Default to Server Components                                                                              |
| Memoization           | Use `useMemo`/`useCallback`/`memo` with React Compiler                                    | Let compiler optimize automatically                                                                        |
| Imports               | Use relative paths (`../../../lib/utils`)                                                 | Use path aliases (`~/lib/utils`)                                                                            |
| Logging               | Use `console.log` in production code                                                       | Use structured Pino logging (`logger.info(...)`)                                                            |
| `useFormStatus`       | Use in same component as `<form>`                                                          | Use in a child component inside the form                                                                    |
| Server Actions        | Return untyped objects                                                                     | Use standardized response types with Zod validation                                                         |
| Failure simulation    | Derive a failure roll from the same seeded PRNG as latency (`hash(seed,id)`)                | Keep latency deterministic but roll failure with a fresh, unseeded `Math.random()` per attempt — otherwise a failed item can never succeed on retry |
| Secondary/dev tools   | Fetch a side panel's data inside the page's main `loadData()`                              | Give it its own async Server Component behind a `<Suspense>` boundary so it can't block the critical path   |
| `sessionStorage`      | Read it in a `useState` initializer                                                        | Read it in a mount `useEffect` — the initializer runs during SSR, where `sessionStorage` doesn't exist       |
| DS `asChild` (Radix Slot) | Pass an anchor/element created by a Server Component as `children` into a Client Component's `asChild` Button | Build the whole `asChild` composition (Button + its child element) inside one Client Component — otherwise the Slot prop-merge can differ between SSR and hydration and throw a mismatch |
