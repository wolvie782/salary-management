# AGENTS.md - orientation for AI coding assistants

Read this before changing anything. It is the fast path to understanding how
this repo works and which rules must stay intact. docs/ has the long form.

## What this is

Salary management software for the HR manager of a 10,000 person,
multi-country organization (ACME, fictional; all data synthetic). Built as an
engineering assessment. NestJS + Prisma + PostgreSQL API in `server/`, Next.js +
Tailwind + Recharts UI in `web/`, npm workspaces monorepo.

## Commands

- `npm install` - install everything (root installs both workspaces)
- `docker compose up -d db` - start the local Postgres the app uses
- `npm run db:setup -w server` - migrate and reset to the deterministic dataset
- `npm run dev:server` / `npm run dev:web` - run API (3001) and UI (3000)
- `docker compose up -d test-db` then `npm test -w server` - 33 deterministic
  tests against isolated schemas in the test database
- `npm run build -w server && npm run build -w web` - production builds
- `node scripts/smoke.mjs` - boots built apps, checks the auth flow end to end
  (needs the test database running)

## Invariants that must not break

1. Salary history is append only. A change closes the open record
   (`effectiveTo`) and inserts a new open record in one transaction, with a
   conditional update so concurrent changes cannot both win. Never update a
   historical row's amount.
2. Every employee has exactly one open salary record (`effectiveTo IS NULL`).
3. Every route requires a JWT except `/health` and `/auth/login`. New routes
   are protected by default; opt out only via `@Public()` with a reason.
4. Money is Prisma `Decimal`, never float, and analytics aggregate in SQL.
5. The seed is deterministic (seeded PRNG, fixed reference date). Tests rely
   on this. No randomness, no wall clock in the generator.
6. No secrets in the repo. Credentials and secrets come from env vars
   (`.env.example` documents them with safe local defaults only).
7. Errors: clients get sanitized responses from the global exception filter;
   detail goes to server logs. Never return stack traces or Prisma internals.

## Conventions

- Feature modules under `server/src/<feature>/` with controller, service,
  and `dto/` next to them. Shared code in `server/src/common/`.
- React pages under `web/app/`, reusable components in `web/components/`,
  API client and formatting helpers in `web/lib/`.
- Commit small and often, messages as plain imperative sentences.
- Tests live next to the code as `*.spec.ts`; e2e under `server/test/`.
  Every behavior change ships with a test change.

## When adding a feature

1. Check docs/requirements.md for whether it is in scope or a documented
   exclusion. New exclusions need the same treatment.
2. Schema change: edit `server/prisma/schema.prisma`, run
   `npx prisma migrate dev --name <what-changed>`.
3. Endpoint: DTO with class-validator first, then service, then controller.
4. Cover the failure cases in `server/test/`, not just the happy path.
5. Update docs/ if a decision or convention changed.
