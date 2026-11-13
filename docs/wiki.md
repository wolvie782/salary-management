# Codebase Wiki

## Quick orientation

ACME People Pay is a salary management tool for a single HR Manager persona.
It is an npm-workspaces monorepo with two deployable services: `server/`
(NestJS + Prisma + PostgreSQL REST API on port 3001) and `web/` (Next.js +
Tailwind + Recharts UI on port 3000). The UI fetches from the API using a
Bearer JWT stored in localStorage. Every API route requires a valid token
except `/health` and `/auth/login`.

---

## Directory map

```
salary-management/
├── server/                        NestJS API
│   ├── prisma/
│   │   ├── schema.prisma          All models: Employee, SalaryRecord, Department, FxRate, User, AuditLog, ThrottleRecord
│   │   └── migrations/            20261113185519_init · 20261113202823_add_audit_log
│   └── src/
│       ├── app.module.ts          Root module; wires all feature modules
│       ├── auth/                  JWT sign-in, global guard, @Public() decorator
│       ├── employees/
│       │   ├── dto/employee.dto.ts  CreateEmployeeDto, UpdateEmployeeDto, CreateSalaryChangeDto, ListEmployeesQuery
│       │   ├── employees.controller.ts  Routes: list, export, byId, create, update, addSalaryChange
│       │   ├── employees.module.ts
│       │   └── employees.service.ts  Business logic, audit fire-and-forget
│       ├── analytics/             SQL aggregation queries (overview, by-dept, by-country, distribution, top-earners)
│       ├── audit/
│       │   ├── audit.controller.ts  GET /audit
│       │   ├── audit.module.ts
│       │   └── audit.service.ts   log() + list()
│       ├── meta/                  GET /meta/filters — filter option lists for the UI
│       ├── seeding/               Deterministic 10k employee dataset (seeded PRNG, fixed date 2026-11-01)
│       ├── common/                Money math (Decimal, FX), global exception filter
│       └── prisma/                Shared PrismaService + PrismaModule
│
├── web/                           Next.js 14 App Router UI
│   ├── app/
│   │   ├── page.tsx               Dashboard (KPI cards, charts, top earners)
│   │   ├── login/page.tsx         Sign-in page
│   │   ├── employees/
│   │   │   ├── page.tsx           Employee listing (search, filter, sort, export, import)
│   │   │   ├── new/page.tsx       Add employee form
│   │   │   └── [id]/
│   │   │       ├── page.tsx       Employee detail (profile, inline edit, status, salary history)
│   │   │       └── SalaryChangeForm.tsx  Salary change form component
│   │   ├── assistant/page.tsx     HR Assistant chat (rule-based intent router)
│   │   └── audit/page.tsx         Audit log timeline
│   ├── components/
│   │   ├── AuthGate.tsx           Client-side auth check; redirects to /login
│   │   ├── Charts.tsx             DepartmentChart, CountryChart, DistributionChart (Recharts)
│   │   ├── Nav.tsx                Top nav + mobile drawer
│   │   ├── Select.tsx             Custom dropdown (avoids macOS native select styling)
│   │   └── StatusBadge.tsx        Colored status pill (ACTIVE / INACTIVE / ON_LEAVE)
│   └── lib/
│       ├── api.ts                 All API calls with Bearer auth; typed helpers
│       └── format.ts              formatUsdCompact, countryName, currency formatters
│
├── docs/                          Design record
│   ├── wiki.md                    This file — codebase mind map
│   ├── requirements.md            Scope, features, deliberate exclusions
│   ├── architecture.md            Data model, request flow, security, testing
│   ├── tradeoffs.md               Design decisions and their costs
│   ├── performance.md             Measurements and scaling levers
│   ├── deployment.md              Free-tier deploy plan (Vercel + Neon)
│   ├── ai-usage.md                How AI tools were used
│   └── walkthrough.md             Plain-language tour for reviewers
│
├── scripts/
│   └── smoke.mjs                  Full boot + auth flow smoke test
├── docker-compose.yml             Local Postgres (db) + test Postgres (test-db)
├── AGENTS.md                      Working rules for AI assistants
├── CLAUDE.md                      Entry point + non-negotiable rules
└── package.json                   Workspace root; dev:server, dev:web, build
```

---

## Feature map

### Employee directory
- **Server module:** `employees` → `employees.service.ts → list()`
- **Endpoint:** `GET /employees` (page, pageSize ≤ 100, search, department, country, status, employmentType, sortBy, sortDir)
- **Web page:** `/employees` (`web/app/employees/page.tsx`)
- **Components:** `Nav.tsx`, `AuthGate.tsx`, `StatusBadge.tsx`, `Select.tsx`

### Employee profile + inline editing
- **Server module:** `employees` → `byId()`, `update()`
- **Endpoints:** `GET /employees/:id`, `PATCH /employees/:id`
- **Web page:** `/employees/[id]` (`web/app/employees/[id]/page.tsx`)
- **Components:** `StatusBadge.tsx`, `Select.tsx`
- **Notes:** Inline edit form opens in the Role Details card on the detail page; save calls `PATCH /employees/:id`

### Status changes
- **Server module:** `employees` → `update()` (status is a field on UpdateEmployeeDto)
- **Endpoint:** `PATCH /employees/:id` with `{ status: "ACTIVE" | "INACTIVE" | "ON_LEAVE" }`
- **Web page:** `/employees/[id]` — Select dropdown next to StatusBadge in the profile header; fires on change with a loading overlay
- **Audit:** fires `STATUS_CHANGED` → `AuditService.log()`

### Salary changes (append-only)
- **Server module:** `employees` → `addSalaryChange()`
- **Endpoint:** `POST /employees/:id/salary-changes`
- **Web page:** `/employees/[id]` → `SalaryChangeForm.tsx`
- **Invariant:** Closes old open `SalaryRecord` (sets `effectiveTo`) and inserts a new one in one `$transaction` with a conditional update (race-safe). Rejects dates in the past relative to the current open record.
- **Audit:** fires `SALARY_CHANGED`

### CSV export
- **Server module:** `employees` → `export()`
- **Endpoint:** `GET /employees/export` (same filter params as list, no pagination, `Content-Disposition: attachment`)
- **Web page:** `/employees` — Export button calls the endpoint directly with Bearer auth header
- **Notes:** Uses a dedicated endpoint (not the paginated list) because `ListEmployeesQuery.pageSize` is capped at 100 by `@Max(100)`

### CSV import
- **Server module:** `employees` → `create()` (called row by row)
- **Endpoint:** `POST /employees` (one per row)
- **Web page:** `/employees` — Import modal: drag/drop or file picker → `FileReader.readAsText` → `parseCsv()` → 5-row preview → "Import" runs row by row with progress bar + error list
- **Notes:** Column aliases accepted (firstName/first_name, hireDate/hire_date, etc.); departmentId resolved by name if not numeric

### Analytics / dashboard
- **Server module:** `analytics`
- **Endpoints:** `GET /analytics/overview`, `/by-department`, `/by-country`, `/distribution`, `/top-earners`
- **Web page:** `/` (`web/app/page.tsx`)
- **Components:** `Charts.tsx` (DepartmentChart, CountryChart, DistributionChart)
- **Notes:** All aggregation in SQL with FX join. Median and distribution load ~10k USD floats into memory (acceptable at this scale).

### Audit log
- **Server module:** `audit` → `AuditService.log()` + `list()`
- **Endpoint:** `GET /audit?limit=N` (default 200, ordered by createdAt desc)
- **Web page:** `/audit` (`web/app/audit/page.tsx`)
- **Flow:** Every `employees.service` mutation calls `audit.log()` fire-and-forget (`.catch(() => undefined)`) so audit failure never fails the main operation
- **Fields recorded:** action, entityType, entityId, details (JSON), performedBy (email from `req.user.email` via JWT), createdAt

### AI assistant
- **Server module:** None — routes to existing analytics endpoints
- **Web page:** `/assistant` (`web/app/assistant/page.tsx`)
- **How it works:** `routeQuestion(q)` does regex intent matching on the question text, calls the matching analytics API, and returns a structured `Answer` with optional inline data table
- **Supported intents:** total payroll, headcount, average salary, median salary, department breakdown, country breakdown, top earners, salary distribution
- **Status:** "Coming Soon" badge; full LLM routing is not wired — the architecture is a one-function swap

### Authentication / auth guard
- **Server module:** `auth`
- **Endpoints:** `POST /auth/login` (`@Public()`), `GET /health` (`@Public()`)
- **Guard:** Global `JwtAuthGuard` applied to every route; routes opt out with `@Public()`
- **Web component:** `AuthGate.tsx` checks localStorage for a token and redirects to `/login` if absent
- **Session:** JWT signed with `JWT_SECRET`, 12-hour expiry; sent as `Authorization: Bearer <token>`

---

## Data model reference

```
Department
  id          Int  PK
  name        String (unique)
  employees   Employee[]

Employee
  id              Int  PK
  employeeCode    String (unique, e.g. ACME-000001)
  firstName       String
  lastName        String
  email           String (unique)
  jobTitle        String
  employmentType  String  (FULL_TIME | PART_TIME | CONTRACT | INTERN)
  status          String  (ACTIVE | INACTIVE | ON_LEAVE)
  country         String  (ISO code)
  currency        String  (ISO code)
  hireDate        DateTime
  departmentId    Int  FK → Department
  salaries        SalaryRecord[]

SalaryRecord
  id            Int  PK
  employeeId    Int  FK → Employee
  amount        Decimal
  currency      String
  effectiveFrom DateTime
  effectiveTo   DateTime?  (null = current open record; exactly one per employee)
  reason        String  (HIRE | RAISE | PROMOTION | ADJUSTMENT | CORRECTION | MARKET_ADJUSTMENT)
  note          String?

FxRate
  currency    String  PK
  usdPerUnit  Decimal
  asOf        DateTime  (snapshot 2026-11-01)

User
  id            Int  PK
  email         String (unique)
  passwordHash  String  (bcrypt)
  — seeded from HR_EMAIL / HR_PASSWORD env vars

AuditLog
  id            Int  PK
  action        String  (EMPLOYEE_CREATED | PROFILE_UPDATED | STATUS_CHANGED | SALARY_CHANGED)
  entityType    String  (EMPLOYEE | SALARY_RECORD)
  entityId      Int
  details       Json    (what changed)
  performedBy   String  (email from JWT)
  createdAt     DateTime  (auto)
  — indexes: [entityId, entityType], [createdAt]

ThrottleRecord
  key         String  PK
  count       Int
  expiresAt   DateTime
  — Postgres-backed rate limiter; holds across serverless instances
```

---

## API reference

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/login` | Public | Sign in; returns `{ access_token }` |
| GET | `/health` | Public | Healthcheck |
| GET | `/employees` | JWT | Paginated directory; params: page, pageSize (≤100), search, department, country, status, employmentType, sortBy, sortDir |
| GET | `/employees/export` | JWT | Full CSV download (no page cap); same filter params as list |
| GET | `/employees/:id` | JWT | Profile + full salary history |
| POST | `/employees` | JWT | Create employee + initial salary record |
| PATCH | `/employees/:id` | JWT | Edit profile fields; fires PROFILE_UPDATED or STATUS_CHANGED audit |
| POST | `/employees/:id/salary-changes` | JWT | Append-only salary change; fires SALARY_CHANGED audit |
| GET | `/analytics/overview` | JWT | Headcount, total payroll USD, average USD, median USD |
| GET | `/analytics/by-department` | JWT | Payroll + avg per department, sorted descending |
| GET | `/analytics/by-country` | JWT | Headcount + avg per country, sorted descending |
| GET | `/analytics/distribution` | JWT | Salary histogram (USD buckets) |
| GET | `/analytics/top-earners` | JWT | Top N employees by current salary USD |
| GET | `/meta/filters` | JWT | Lists of departments, countries, statuses, employment types |
| GET | `/audit` | JWT | Audit log entries; param: limit (default 200) |

---

## Web routes reference

| Route | File | What it shows | Key components |
|-------|------|---------------|----------------|
| `/login` | `app/login/page.tsx` | Sign-in form | — |
| `/` | `app/page.tsx` | Dashboard: KPI cards, charts, top earners | `Charts.tsx` (3 chart types) |
| `/employees` | `app/employees/page.tsx` | Directory: search, filter, sort, paginate, export CSV, import CSV | `StatusBadge.tsx`, `Select.tsx` |
| `/employees/new` | `app/employees/new/page.tsx` | Add employee form | `Select.tsx` |
| `/employees/[id]` | `app/employees/[id]/page.tsx` | Profile, inline edit, status change, salary history, salary change | `StatusBadge.tsx`, `Select.tsx`, `SalaryChangeForm.tsx` |
| `/assistant` | `app/assistant/page.tsx` | HR Assistant chat; routes to analytics APIs | — |
| `/audit` | `app/audit/page.tsx` | Audit log timeline; filter by action type | `Select.tsx` |

All routes except `/login` are wrapped in `AuthGate.tsx` which redirects to `/login` if no token is present in localStorage.

---

## Key invariants

These rules must never be violated:

1. **Append-only salary timeline.** A salary change closes the existing open `SalaryRecord` and inserts a new one in a single `$transaction` with a conditional `updateMany` that matches only the still-open record. Two concurrent changes cannot both win. History is never deleted or overwritten.

2. **Auth on every route.** The global `JwtAuthGuard` runs before every handler. Routes that intentionally skip auth must carry `@Public()` with an explicit reason in a comment.

3. **Decimal money.** Salary `amount` and FX `usdPerUnit` are stored as Prisma `Decimal`. They are converted to JS `number` only at response serialization, after all aggregation, to avoid floating-point drift.

4. **SQL aggregation.** Analytics queries group and sum in SQL with the FX join; the API returns a handful of rows, not a full table scan in JS. Exception: median and distribution load ~10k current USD floats once per request (documented in performance.md).

5. **Deterministic seed.** The seeding module uses a seeded PRNG and a fixed reference date (2026-11-01). No `Math.random()` or `Date.now()` calls in the generator. This makes tests reproducible across machines and runs.

6. **Sanitized errors.** The global exception filter returns a sanitized message to clients and logs the full error (including Prisma internals) on the server. No stack traces or Prisma error codes reach the browser.

7. **No secrets in repo.** All credentials (`HR_EMAIL`, `HR_PASSWORD`, `JWT_SECRET`, `DATABASE_URL`) come from environment variables. `.env.example` holds safe local defaults.

---

## How a request flows

### Example 1: Record a salary change

```
Browser → POST /employees/42/salary-changes
         { amount: 95000, effectiveFrom: "2026-12-01", reason: "RAISE" }

1. JwtAuthGuard runs globally:
   - Extracts Bearer token from Authorization header
   - Verifies signature against JWT_SECRET
   - Attaches decoded payload (email, sub) to req.user

2. EmployeesController.addSalaryChange():
   - ParseIntPipe coerces ":42" → number
   - CreateSalaryChangeDto validates body (amount > 0, valid date, valid reason enum)
   - Passes dto + req.user.email ("hr@acme.example") to employees.service.addSalaryChange()

3. EmployeesService.addSalaryChange():
   - Loads employee (throws 404 if missing)
   - Parses effectiveFrom; rejects if it's before or equal to the current open record's start
   - prisma.$transaction(async (tx) => {
       current = tx.salaryRecord.findFirst({ where: { employeeId: 42, effectiveTo: null } })
       closed = tx.salaryRecord.updateMany({
         where: { id: current.id, effectiveTo: null },  // conditional — race safe
         data: { effectiveTo: day before effectiveFrom }
       })
       if (closed.count !== 1) throw ConflictException   // lost the race → 409
       tx.salaryRecord.create({ employeeId: 42, amount: 95000, effectiveFrom, … })
     })
   - fire-and-forget: audit.log({ action: "SALARY_CHANGED", entityId: 42,
       details: { amount, reason, effectiveFrom }, performedBy: "hr@acme.example" })
       .catch(() => undefined)   // audit failure must not fail the main op
   - returns byId(42) — full profile with new history

4. Global exception filter: any unhandled error → sanitized JSON to client, full error to server log

5. Browser receives updated employee profile; UI re-renders salary history table
```

### Example 2: Audit log write

```
Any mutating employees route (create / update / salary-change)
  → controller extracts req.user.email from the JWT
  → passes performedBy into service method
  → service completes its main DB operation
  → calls this.audit.log({
        action: "PROFILE_UPDATED",
        entityType: "EMPLOYEE",
        entityId: id,
        details: dto,           // the changed fields as JSON
        performedBy: email      // "hr@acme.example"
     }).catch(() => undefined)  // fire-and-forget

Inside AuditService.log():
  → prisma.auditLog.create({
        data: { action, entityType, entityId, details, performedBy, createdAt: now }
     })

The .catch(() => undefined) means:
  - If the AuditLog insert fails (DB hiccup, constraint error), the error is swallowed
  - The employee mutation has already committed — it is not rolled back
  - The audit entry is lost, but the user's data change is preserved

GET /audit:
  → AuditController → AuditService.list(limit)
  → prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit })
  → web/app/audit/page.tsx renders timeline with ACTION_META icons, humanValue() display,
    formatDetails() per action type, timeAgo() relative timestamps
```

---

## Dev commands reference

Run all commands from the **repo root** unless noted.

```bash
# Install all workspace dependencies
npm install

# Start local Postgres (Docker required)
docker compose up -d db

# Copy env files (first time)
cp server/.env.example server/.env
cp web/.env.example web/.env.local

# Migrate database + seed 10,000 employees
npm run db:setup -w server
# (or from repo root:)
npm run db:setup

# Start API server (port 3001)
npm run dev:server

# Start web UI (port 3000)
npm run dev:web

# Run tests (needs test-db running)
docker compose up -d test-db
npm test -w server

# Build both packages
npm run build

# Smoke test (needs builds + test-db)
node scripts/smoke.mjs

# Re-seed from scratch (destroys all changes)
npm run db:setup -w server

# Generate Prisma client after schema changes
npx prisma generate --schema server/prisma/schema.prisma

# Apply migrations to a live DB
npx prisma migrate deploy --schema server/prisma/schema.prisma
```
