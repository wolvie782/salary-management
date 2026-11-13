# Deployment: Vercel + Neon (manual, free tier)

Facts verified against official documentation on 14 Nov 2026:
https://vercel.com/docs/frameworks/backend/nestjs,
https://vercel.com/docs/functions/limitations,
https://vercel.com/docs/plans/hobby,
https://neon.com/pricing,
https://neon.com/faqs/free-plan-limits-and-quotas.

## Shape

- Web (`web/`, Next.js) and API (`server/`, NestJS) deploy as two Vercel
  projects from this one repo. Vercel supports NestJS with zero
  configuration: it detects `server/src/main.ts` and runs the app as a
  single function on Fluid compute.
- Database: Neon serverless Postgres. The free plan is permanent, needs no
  credit card, includes 1 GB storage and 100 CU-hours of compute per month,
  and never deletes data when a limit is hit (compute suspends instead).
- Total cost: $0 within the free limits. The API function sleeps when idle,
  so the first request after a quiet period can take a few seconds.

## 1. Neon (database)

1. Sign up at https://neon.com (free, no card).
2. Create a project; pick the region closest to the reviewers.
3. In Connection Details, copy the **pooled** connection string (it contains
   `-pooler`). Serverless functions open many short-lived connections; the
   pooler is the right endpoint for that.

## 2. Create the schema and load the demo data

On your own machine, with this repo cloned:

```bash
cd server
cp .env.example .env      # then set DATABASE_URL in .env to the Neon pooled string
npm install
npm run db:setup          # prisma migrate deploy + seed of 10,000 employees
```

Set `HR_EMAIL`, `HR_PASSWORD` and `JWT_SECRET` in `.env` before this step if
you want your own credentials instead of the demo defaults.

## 3. Vercel project: API

1. vercel.com, Add New, Project, import this repo.
2. Set Root Directory to `server`. Framework is detected as NestJS
   automatically; no build settings to fill in.
3. Environment variables:
   - `DATABASE_URL` = the Neon pooled connection string
   - `JWT_SECRET` = a long random string (the API refuses to boot in
     production without it)
   - `WEB_ORIGIN` = the web URL from step 4; add it then, then redeploy
4. Deploy and note the API URL.
5. Check `https://<api-url>/health` returns `{"status":"ok"}`.

## 4. Vercel project: web

1. Add New, Project, import the same repo again.
2. Root Directory `web`. Framework Next.js is auto-detected.
3. Environment variable: `NEXT_PUBLIC_API_URL` = the API URL from step 3.
4. Deploy and note the web URL.
5. Back in the API project, set `WEB_ORIGIN` to exactly this URL (no
   trailing slash) and redeploy the API. CORS only allows this origin.

## 5. Verify the deployment

- Open the web URL and sign in (`hr@acme.example` / `acme-demo-password`
  unless you set your own in step 2).
- The dashboard shows 10,000 employees; search the directory; record a raise
  and confirm the salary history grows by one row.
- If the first click after idle is slow for a few seconds, that is the
  function and database waking up, not an error.

## Troubleshooting

- API 500s or function errors: check the API project's logs; usually
  `DATABASE_URL` is missing or is the direct instead of pooled string.
- Browser CORS errors: `WEB_ORIGIN` does not exactly match the web URL.
- `JWT_SECRET must be set in production`: add it to the API project and
  redeploy.
- Login works but the directory is empty: run `npm run db:setup` again with
  `DATABASE_URL` pointing at Neon.
- Neon quota exhausted (100 CU-hours or 5 GB egress in a month): compute
  pauses until the next monthly window; data is safe.

## Known limits of this shape

- Cold starts after idle (a few seconds, both Vercel functions and Neon).
- Rate limiting is stored in Postgres (`ThrottleRecord` table), so the
  300 req/min global and 10 req/min login limits hold across all function
  instances.
- Vercel Hobby is a personal plan; Neon free suspends compute (never data)
  when quotas run out. Neither is a production SLA.
- Wiping the Neon database and rerunning `db:setup` restores the clean demo
  dataset, and destroys every change made through the UI. Treat it as a
  deliberate data-deleting action.
