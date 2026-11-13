# Architecture

## Shape

```mermaid
flowchart LR
    subgraph Browser
        UI[Next.js app]
    end
    subgraph Server
        API[NestJS API]
        DB[(SQLite via Prisma)]
    end
    UI -->|REST, JSON| API
    API --> DB
```

Two deployable units in one npm-workspaces monorepo:

- `server/` - NestJS (Node + TypeScript) REST API. Prisma ORM over SQLite.
  Modules: `employees` (directory, profiles, salary changes), `analytics`
  (pay questions), `meta` (filter options), `prisma` (shared client).
- `web/` - Next.js (React + TypeScript) UI. The dashboard and employee pages
  are server rendered and fetch from the API; interactive pieces (charts,
  filters, forms) are client components. Tailwind for styling, Recharts for
  charts.

## Data model

```mermaid
erDiagram
    Department ||--o{ Employee : has
    Employee ||--o{ SalaryRecord : "history"
    FxRate ||--|| SalaryRecord : "currency lookup"
    Employee {
        int id PK
        string employeeCode UK
        string email UK
        string country
        string currency
        string status
        date hireDate
    }
    SalaryRecord {
        int id PK
        int employeeId FK
        decimal amount
        string currency
        date effectiveFrom
        date effectiveTo "null = current"
        string reason
    }
    FxRate {
        string currency PK
        decimal usdPerUnit
        date asOf
    }
```

The key decision: **salary is an append-only timeline**. A change closes the
open record (`effectiveTo`) and inserts a new open record, in one transaction.
History can never be overwritten, which is what makes audit questions ("what
did we pay this person last March?") answerable and what makes the timeline
safe against partial failures.

## Request flow example: record a raise

1. `POST /employees/:id/salary-changes` hits NestJS; the global guard checks
   the Bearer JWT before any handler runs.
2. `CreateSalaryChangeDto` validates shape, ranges and enums (class-validator,
   global ValidationPipe with `whitelist: true` strips unknown fields).
3. `EmployeesService.addSalaryChange` loads the open salary record, rejects
   dates that would rewrite the past, then closes the old record and inserts
   the new one inside `prisma.$transaction`.
4. The UI re-fetches the employee and the history table shows the new row.

## Security posture

Salary data is sensitive, so the default is closed: a global auth guard
requires a JWT on every route except `/health` and `/auth/login`.

- Sign in: one HR Manager account, email + password. Passwords are stored as
  bcrypt hashes; the seed creates the account from `HR_EMAIL` / `HR_PASSWORD`
  environment variables, so a real deployment sets its own credentials and
  nothing secret is committed.
- Sessions: JWT signed with `JWT_SECRET` from env, 12 hour expiry. The UI
  keeps the token in localStorage and sends it as a Bearer header.
- Login errors use one generic message and run a dummy bcrypt comparison for
  unknown emails, so responses do not reveal which accounts exist.
- Mutations are validated DTOs (`whitelist: true` strips unknown fields), and
  the salary change runs in a transaction with a conditional close so two
  simultaneous raises cannot both win (see the race test).
- All database access is parameterized (Prisma, or static SQL for analytics).
- helmet security headers, 300 req/min global rate limiting with a stricter
  10 req/min limit on login, CORS restricted to the web origin.
- JWTs are signed with JWT_SECRET; the API refuses to boot in production
  without it, so a deployment can never silently use the public dev default.
- Deliberately not built: SSO, multiple roles, row level permissions. One
  persona means one role; see docs/requirements.md.
- Shared demo identity: every reviewer signs in as the same account and can
  mutate the same dataset with no per-person attribution. That is a demo
  limitation, not a security model; the README covers it and the reseed
  path for restoring a clean dataset.

## Testing

- `src/common/money.spec.ts` - FX conversion, median, bucket math.
- `src/seeding/generator.spec.ts` - dataset determinism and invariants
  (exactly one open salary record per employee, ordered history).
- `src/employees/employees.service.spec.ts` - integration tests against a
  throwaway SQLite file: pagination, search, filters, employee creation,
  and the salary-change transaction (history preserved, single open record).

All tests are deterministic: the dataset comes from a seeded PRNG and the
integration DB is a temp file, so runs are fast (~3s) and repeatable.
