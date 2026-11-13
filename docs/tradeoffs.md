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

## Append-only salary timeline instead of an audit log

Two options considered: mutate the salary row and write an audit log, or make
the salary itself a timeline. The timeline is simpler (one table, no
dual-write consistency problem) and directly answers "what was the salary on
date X". Corrections of historical mistakes are the known gap: the API
rejects changes dated into the past rather than rewriting history; a real
deployment would add an admin correction flow.

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

## No login screen

See docs/requirements.md. In short: single-role internal tool behind SSO; the
defense-in-depth that matters for this data (validation, parameterization,
headers, rate limiting) is implemented instead.
