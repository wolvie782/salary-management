# CLAUDE.md

Entry point for Claude (and similar assistants) working in this repo.
AGENTS.md has the full working rules; docs/ has the design record. Read
AGENTS.md first, then the docs page for the area you are touching.

## Architecture in one minute

- npm workspaces monorepo: `server/` (NestJS + Prisma + SQLite API,
  port 3001) and `web/` (Next.js + Tailwind + Recharts, port 3000).
- Server modules by feature: `auth` (JWT login, global guard), `employees`
  (directory, profiles, salary changes), `analytics` (pay aggregations in
  SQL), `meta` (filter options), `seeding` (deterministic 10k dataset),
  `common` (money math, global exception filter), `prisma` (shared client).
- Web routes: `/` dashboard, `/employees`, `/employees/[id]`,
  `/employees/new`, `/login`. Client components fetch with a Bearer token
  stored in localStorage; the API enforces auth regardless.
- Data model: Employee 1-N SalaryRecord (append only timeline, exactly one
  open record per employee), Department 1-N Employee, FxRate snapshot table,
  User (single HR role).

## Commands

`npm install` | `npm run seed -w server` | `npm run dev:server` /
`npm run dev:web` | `npm test -w server` (33 tests) | `npm run build` |
`node scripts/smoke.mjs` (full boot + auth flow, needs builds first)

## Non negotiable rules

1. Salary history is append only: close the open record, insert the new one,
   one transaction, conditional update (race safe). Never rewrite history.
2. Every route requires auth unless explicitly `@Public()` with a reason.
3. Money is `Decimal`; analytics aggregate in SQL; round only at display.
4. The seed is deterministic (seeded PRNG, fixed reference date). No wall
   clock or randomness in the generator.
5. Error responses come from the global filter: sanitized for clients,
   detailed in server logs. No stack traces or Prisma internals to clients.
6. No secrets in the repo; env vars only, `.env.example` carries safe local
   defaults.

## Docs

requirements.md (scope + exclusions) | architecture.md (data model, request
flow, security) | tradeoffs.md (decisions and costs) | performance.md
(measured vs reasoned limits) | deployment.md (verified free tier plan) |
ai-usage.md (how AI was used, per the assessment brief)
