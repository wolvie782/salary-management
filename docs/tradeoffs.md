# Trade-offs and decisions

## PostgreSQL everywhere

The first version used SQLite so a reviewer could run the app with zero
infrastructure. Preparing the Vercel deployment surfaced real differences
(raw SQL identifier quoting, case-insensitive search, SQLite-only catalog
tables), so the project now standardizes on Postgres for development, tests
and production: one engine, one set of semantics, no surprises between a
local run and the hosted demo. The cost is one extra local step,
`docker compose up -d db`, documented in the README. Enums stay as
validated string fields to keep the schema simple at this size.

## Decimal amounts, not floats, not integer minor units

Salaries are money: floats accumulate rounding error, and integer minor units
(cents, paise, sen) overflow 32-bit ints for high-unit currencies like JPY at
executive pay levels. Prisma `Decimal` avoids both. Amounts convert to JS
numbers only at response time, after aggregation, and are rounded to whole
currency units for display.

## Static FX snapshot instead of live rates

`FxRate` is a table with a documented snapshot date (2026-11-01, approximate
public rates). Live rates would need an external paid API, add flakiness to
tests, and change analytics day to day, which makes "how does the org pay
people" questions non-reproducible. The conversion happens in one place
(SQL join), so swapping in a live feed later is a small, isolated change.

## Append-only salary timeline instead of overwriting

Two options considered: mutate the salary row and write an audit log, or make
the salary itself a timeline. The timeline is simpler (one table, no
dual-write consistency problem) and directly answers "what was the salary on
date X". Corrections of historical mistakes are the known gap: the API
rejects changes dated into the past rather than rewriting history; a real
deployment would add an admin correction flow.

## Audit log alongside the append-only timeline, not instead of it

The append-only timeline was the original answer to "what changed and when"
for salary data. The audit log was added anyway because: (1) profile edits
and status changes are not covered by the salary timeline, (2) it records
*who* made the change (the JWT email), which the timeline cannot, and (3) it
gives HR a single place to answer "what changed and when" across all entity
types. The two are complementary: the timeline is the source of truth for
salary values; the audit log is the source of truth for who-changed-what-
and-when.

Audit writes are fire-and-forget (`.catch(() => undefined)`): an audit
failure must never fail the employee mutation it accompanies. The tradeoff is
that a DB hiccup can cause a lost audit entry. This is acceptable for a demo;
a production system would use a transactional outbox or at-least-once queue.

## SQL aggregation for analytics, not in-memory reduction

Dashboard queries group and sum in SQL with the FX join, so the API ships
a handful of rows instead of 10k. Median and distribution are the exception:
they need ordered values, so those load the current USD salaries (~10k
floats, under 1 MB) once per request. At 10k employees this is single-digit
milliseconds; at 100k I would move to percentile SQL or a materialized table.

## NestJS + Next.js over a single Next.js app

A Next.js-only app would be one deployable, but the role is a Node/TypeScript
backend role and the separation shows the API contract explicitly. The cost
is two services to run and CORS to manage; the benefit is that the backend
stands alone (it could serve a future mobile app or integration unchanged).

## Rule-based AI assistant over calling an LLM directly

The HR Assistant routes natural-language questions to the existing analytics
APIs using regex intent matching rather than calling an LLM. Reasons: (1) the
analytics API already answers the questions HR asks, (2) a rule-based router
is deterministic, cheap and testable, (3) the architecture is a thin layer
that can be swapped for a real LLM call without changing the analytics API or
the UI. The "Coming Soon" label is accurate: the LLM routing path is not
wired, but the intent-to-API mapping is in place for it.

## Separate export endpoint instead of raising the pageSize cap

The employee list DTO caps `pageSize` at 100 (class-validator `@Max`) to
prevent unbounded queries from the paginated UI. Rather than raise or remove
that cap, CSV export uses a dedicated `GET /employees/export` endpoint that
bypasses pagination entirely and streams the full result set as a CSV string.
The cap stays on the list endpoint; the export endpoint grows independently.
This is also why the client calls the export endpoint directly with a Bearer
header rather than passing `pageSize=10000` to the list — that would silently
truncate to 100.
