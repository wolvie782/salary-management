# Deployment plan

Two free-tier services, both created by signing in with GitHub:

1. API on Render (blueprint in render.yaml). Build migrates and seeds the
   database, then starts the NestJS server. The free tier has ephemeral
   disk, so the SQLite file resets on redeploy; the seed script runs at
   build time, which makes that a feature for a demo: every deploy starts
   from the same clean, deterministic dataset.
2. Web on Vercel, root directory `web`, one environment variable:
   `NEXT_PUBLIC_API_URL` pointing at the Render URL.

Back on the API, `WEB_ORIGIN` is set to the Vercel URL so CORS stays locked
to the real frontend.

Nothing here runs until the accounts are created and connected; the app is
fully runnable locally without them (see README).
