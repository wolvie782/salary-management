# Performance considerations

Target: HR operations over 10,000 employees feel instant on ordinary hardware.

## What we measured locally

- Seed: 10,000 employees + 38,804 salary records insert in about 1.5s.
- Jest suite: about 3s end to end, deterministic.
- Directory list: paged queries (`LIMIT/OFFSET` with a separate `COUNT`) over
  indexed columns; page of 25 returns in single-digit milliseconds against
  the seeded SQLite file.
- Analytics: each dashboard endpoint is one grouped SQL query. Median and
  distribution read ~10k ordered floats once; still single-digit
  milliseconds.

## Where the time goes at 10k rows, and the levers

1. Directory search. `contains` filters on name/email/code are indexed for
   prefix scans; a leading-wildcard search would degrade to a scan, which at
   10k rows is still fine and at 1M rows would move to a search index.
2. Current salary lookup. `SalaryRecord.effectiveTo IS NULL` is indexed, and
   the directory fetches each page's current salaries in one `include`, so
   there is no N+1.
3. Analytics. Aggregations run in SQL, not in memory (see tradeoffs.md).
   The two endpoints that read ordered values (median, distribution) are the
   first candidates for materialization if headcount grows 10x.
4. UI payload. The dashboard fires five small aggregate requests in parallel
   server-side; the directory ships 25 rows per page. No endpoint returns
   unbounded lists.

## Deliberate constraints

- `pageSize` is capped at 100 server-side.
- Rate limiting (300 req/min) keeps a stuck client from degrading the API.
- Tests run against a 120-row throwaway database so the suite stays fast
  enough to run on every commit.

## What would change at 100k+ employees

- Move median/distribution to percentile SQL or a nightly materialized table.
- Add a covering index or trigram/full-text search for name search.
- Postgres instead of SQLite for concurrent writers (schema is Prisma, so
  this is a datasource swap plus migration regeneration).
