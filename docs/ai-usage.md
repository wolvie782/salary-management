# AI usage log

This project was built by Monu Mahto working with an agentic AI coding
assistant, as the assessment asks for. This file records how the assistant
was used and the instructions that drove the work.

## Division of labor

Direction, constraints and priorities came from Monu: the product must handle
scale and security well, the UI must be friendly, and every design choice
must be explainable in an interview. The assistant proposed the design
options, wrote the code and tests, and verified its own work by running the
app and checking the rendered pages. Each decision and its reasoning is
written down in docs/requirements.md and docs/tradeoffs.md so it can be
reviewed and defended on its merits.

Where the assistant's first version was wrong, the fix is part of the record:
a SQL join placed outside its FROM clause (caught by reading the query
before running it), chart bars invisible in rendered screenshots (caught by
looking at the pages, fixed by disabling animation), a "Product Manager
Manager" title bug in generated data (caught by inspecting the directory),
and a race where two simultaneous salary changes could both succeed (caught
by a dedicated concurrency test, fixed with a transactional conditional
close).

## Instructions the assistant worked under

1. Write a one-page requirements document first: goal, scope, features, and
   deliberate exclusions with reasoning. Nothing gets built before that.
2. Model salary as an append-only timeline; a change closes the open record
   and inserts a new one in one transaction. Never overwrite history.
3. Store money as Decimal, normalize analytics to USD with a static FX
   table, and document the snapshot date.
4. Seed 10,000 employees deterministically from a seeded PRNG so tests are
   reproducible: international names, country specific currencies, realistic
   level and department distribution.
5. Analytics must aggregate in SQL, not load tables into memory. Cap page
   sizes and rate limit the API.
6. Protect every route behind sign in; salary data is sensitive even in a
   demo.
7. Tests must be fast, deterministic and cover the salary change flow
   against a throwaway database, including the concurrent change case.
8. Verify the UI by actually rendering it and looking at screenshots, not
   by trusting that the build passed.

## Later session: deployment preparation

A follow-up session prepared the app for a free tier deployment the engineer
chose to run manually (Vercel for web and API, Neon for Postgres). The
assistant audited the code for SQLite-only assumptions and found three real
ones (raw SQL identifier quoting, case-insensitive search behavior, a
SQLite-only catalog table in the seed), switched the project to PostgreSQL
for every environment, moved rate limit counters into Postgres so the login
throttle holds across serverless instances, and reran the full test suite
and smoke test against a real Postgres before committing. Hosting accounts
and the deploy itself are the engineer's, by his choice.

## Later session: fixes from the first live run

The engineer's first local run against PostgreSQL surfaced three bugs the
earlier verification missed: two analytics queries used SQL Postgres rejects
(an unquoted table join and a bare column outside GROUP BY, both tolerated by
SQLite), and the Postgres-backed rate limiter threw write conflicts when the
dashboard fired parallel requests, because its serialization-conflict retry
never matched the driver's error text. The assistant reproduced all three
over HTTP, added regression tests that fail on the broken code (an analytics
end to end suite covering every endpoint plus a parallel burst, and a rate
limiter concurrency spec), then fixed the queries and rebuilt the limiter on
an atomic upsert plus a row lock. It also corrected the earlier claim that
the analytics endpoints were verified: the smoke test had only ever called
the overview endpoint, and it now calls all of them.

## Later session: UI expansion and new features

A further session added audit logging, CSV export/import, an HR Assistant
page, inline profile editing, and status change controls. The assistant also
ran a design critique pass (via /design skill) and improved visual hierarchy
across all pages: KPI cards with colored accent bars, section dividers, ghost
buttons, tabular-nums typography, and a custom scrollbar.

Specific bugs caught and fixed in this session:
- CSV export fetched only 100 records because the client called the paginated
  list endpoint with pageSize=10000, which the DTO's @Max(100) validator
  silently truncated. Fixed by adding a dedicated /employees/export backend
  endpoint with no pagination.
- Audit log showed "by system" because the service hardcoded performedBy.
  Fixed by threading req.user.email from the JWT through the controller into
  every service method.
- The filter dropdown on the audit page used a native macOS <select> element,
  which renders with an indented dark popup that ignores Tailwind classes.
  Fixed by replacing with the custom Select component.
- The salary distribution chart had illegible overlapping x-axis labels
  ($30k-$40k is too long at -45° with 26 buckets). Fixed with a
  shortDistLabel formatter, interval={1} to skip alternating ticks, -55°
  angle, and extra bottom margin.

## Why this way

The brief cares about judgment, not typing speed. Using AI for volume work
while keeping product, data model and correctness decisions explicit is how
these tools earn their place: the assistant proposes, the engineer disposes,
and nothing ships that cannot be defended in a review.
