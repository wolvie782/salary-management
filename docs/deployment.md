# Deployment plan

Verified against current Render and Vercel documentation (13 Nov 2026):

## Recommended: Render free web service (API) + Vercel Hobby (web)

1. API on Render using the blueprint in render.yaml. Build runs
   `prisma migrate deploy`, the seed script, and `nest build`.
2. Web on Vercel Hobby, root directory `web`, with `NEXT_PUBLIC_API_URL`
   pointing at the Render URL.
3. `WEB_ORIGIN` on the API is set to the Vercel URL so CORS stays locked.
4. `JWT_SECRET`, `HR_EMAIL` and `HR_PASSWORD` are set as environment
   variables on Render; the demo defaults never leave this repo.

## Verified constraints that shape this plan

Render free web services (render.com/docs/free):

- The filesystem is ephemeral: local SQLite data is lost on every redeploy,
  restart, or spin down.
- Services spin down after 15 minutes without traffic and take about a
  minute to spin back up (Render shows a loading page meanwhile).
- 750 free instance hours per workspace per month; spun down services do not
  consume them.
- Free Postgres exists (1 GB) but expires 30 days after creation.

Vercel Hobby (vercel.com/docs/plans/hobby):

- Free, but licensed for personal, non commercial use only. A job assessment
  demo qualifies; anything beyond that would need the Pro plan ($20/month).
- Generous included usage (1M function invocations, 100 GB data transfer),
  far above what a reviewer clicking through a demo produces.

## What this means for the demo

Because free Render storage resets, the API seeds the database on every boot,
not just at build: the app always starts from the same deterministic 10,000
employee dataset. Salary changes made during a review session may disappear
after 15 idle minutes; for a demo that is acceptable and even useful (every
reviewer sees the same clean data). If persistent changes become important,
the upgrade path is Render Postgres (free for 30 days, then from $7/month):
Prisma makes it a datasource swap plus regenerated migrations.

Total cost of this plan: $0, within both free tiers, no payment method
required on either side.

## Not authorized yet

No accounts have been created and nothing is deployed. This plan waits for
explicit approval.
