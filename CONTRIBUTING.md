# Contributing guide and project wiki

Welcome. This is the contributor wiki for the ACME salary management app:
how to set it up, how it is organized, and the rules that keep it correct.
Everything here is versioned with the code, so update it in the same commit
as the change it describes.

## Quick start

```bash
npm install
cd server && cp .env.example .env && npx prisma migrate dev && npm run seed && cd ..
npm run dev:server   # API on :3001
cp web/.env.example web/.env.local
npm run dev:web      # UI on :3000
```

Sign in with `hr@acme.example` / `acme-demo-password` (local demo defaults;
real deployments set `HR_EMAIL`, `HR_PASSWORD`, `JWT_SECRET`).

## Repository map

```
salary-management/
  docs/                  requirements, architecture, tradeoffs, performance,
                         AI usage log, deployment plan
  scripts/smoke.mjs      boots built apps and checks the critical path
  server/                NestJS API
    prisma/              schema, migrations, seed script
    src/
      auth/              login, JWT guard (@Public opts out), single HR role
      employees/         directory, profiles, salary changes (core domain)
      analytics/         "how does the org pay people" aggregations
      meta/              filter options for the UI
      seeding/           deterministic dataset generator + loader
      common/            money math, global exception filter
      prisma/            shared Prisma client
    test/                e2e: auth gates, error handling
  web/                   Next.js UI
    app/                 routes: / (dashboard), /employees, /employees/[id],
                         /employees/new, /login
    components/          charts, nav, auth gate, status badge
    lib/                 API client (attaches the JWT), auth storage, formatters
```

## Conventions

- API errors: thrown as Nest `HttpException`s in services; the global filter
  in `server/src/common/http-exception.filter.ts` shapes every response and
  sanitizes unexpected errors. Add mappings there, not in controllers.
- Auth: routes are protected by default through the global guard. Public
  routes need `@Public()` and a comment saying why.
- Validation: class-validator DTOs, `whitelist: true`. Unknown fields are
  stripped, never trusted.
- Money: Prisma `Decimal` columns; convert FX via the `FxRate` snapshot
  table; round only at display time.
- Tests: `*.spec.ts` next to the code, deterministic (no wall clock, seeded
  PRNG). Integration tests use throwaway SQLite files.

## The rules that keep the data correct

1. Salary history is append only; changes close the open record and insert a
   new one inside a transaction with a conditional update (race safe).
2. Every employee always has exactly one open salary record.
3. Analytics exclude `INACTIVE` employees and normalize to USD with the
   documented FX snapshot.
4. The seed is deterministic: same input, same 10,000 employees, every time.

If a change cannot keep these, it is a design change: discuss it in
docs/tradeoffs.md first.

## Testing and verification

- `npm test -w server` - unit + integration + e2e (33 tests).
- `node scripts/smoke.mjs` - full boot, auth flow, seeded counts.
- `npm run build` - both workspaces must build clean.
- CI runs all of the above on every push (.github/workflows/ci.yml).

## Design docs

- docs/walkthrough.md - plain language architecture and flow tour
- docs/requirements.md - scope and deliberate exclusions
- docs/architecture.md - shape, data model, request flow, security, testing
- docs/tradeoffs.md - every significant decision and its cost
- docs/performance.md - measurements, known limits, scaling levers
- docs/deployment.md - free tier deployment plan with verified constraints
- docs/ai-usage.md - how AI tools were used, per the assessment brief
