// Smoke test: boots the built API and web app on scratch ports and checks
// the critical path end to end (health, auth gate, login, directory, pages).
// Requires prior builds: npm run build -w server && npm run build -w web.
// Needs a reachable Postgres, like the test suite (see README); the database
// URL comes from SMOKE_DATABASE_URL or TEST_DATABASE_URL, defaulting to the
// documented local docker compose database. Each run uses a fresh schema.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../server/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');

const API_PORT = 4101;
const WEB_PORT = 4100;
const base =
  process.env.SMOKE_DATABASE_URL ??
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5433/salary_test';
const schema = `smoke_${process.pid}`;

const admin = new PrismaClient({ datasources: { db: { url: base } } });
await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);

const api = spawn('node', ['dist/main.js'], {
  cwd: new URL('../server', import.meta.url),
  env: {
    ...process.env,
    PORT: String(API_PORT),
    DATABASE_URL: `${base}?schema=${schema}`,
    WEB_ORIGIN: `http://localhost:${WEB_PORT}`,
  },
  stdio: 'ignore',
});
const web = spawn('npx', ['next', 'start', '-p', String(WEB_PORT)], {
  cwd: new URL('../web', import.meta.url),
  env: {
    ...process.env,
    NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
  },
  stdio: 'ignore',
});

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures += 1;
}

async function waitFor(url, tries = 90) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

try {
  check('api boots, migrates and seeds an empty database', await waitFor(`http://localhost:${API_PORT}/health`));
  check('web boots', await waitFor(`http://localhost:${WEB_PORT}/login`));

  const unauth = await fetch(`http://localhost:${API_PORT}/employees`);
  check('directory rejects anonymous access', unauth.status === 401, `status ${unauth.status}`);

  const loginRes = await fetch(`http://localhost:${API_PORT}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'hr@acme.example', password: 'acme-demo-password' }),
  });
  const { accessToken } = loginRes.ok ? await loginRes.json() : {};
  check('demo HR login issues a token', Boolean(accessToken));

  const directory = await fetch(`http://localhost:${API_PORT}/employees?pageSize=1`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const body = await directory.json();
  check('directory returns the seeded 10,000 employees', body.total === 10_000, `total ${body.total}`);

  const overview = await fetch(`http://localhost:${API_PORT}/analytics/overview`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const stats = await overview.json();
  check(
    'overview metrics reconcile (on payroll = active + on leave)',
    stats.headcount === 10_000 && stats.paidHeadcount >= stats.activeCount,
    `headcount ${stats.headcount}, paid ${stats.paidHeadcount}, active ${stats.activeCount}`,
  );

  const analytics = await Promise.all(
    ['by-department', 'by-country', 'distribution', 'top-earners'].map(async (ep) => {
      const res = await fetch(`http://localhost:${API_PORT}/analytics/${ep}`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      return [ep, res.status];
    }),
  );
  check(
    'every analytics endpoint answers over PostgreSQL',
    analytics.every(([, status]) => status === 200),
    analytics.map(([ep, status]) => `${ep} ${status}`).join(', '),
  );

  const burst = await Promise.all(
    Array.from({ length: 12 }, () =>
      fetch(`http://localhost:${API_PORT}/analytics/by-department`, {
        headers: { authorization: `Bearer ${accessToken}` },
      }),
    ),
  );
  check(
    'a parallel dashboard burst passes the shared rate limiter',
    burst.every((res) => res.status === 200),
    `${burst.filter((res) => res.status === 200).length}/12 ok`,
  );

  const home = await (await fetch(`http://localhost:${WEB_PORT}/`)).text();
  check('web home renders the shell', home.includes('People Pay'));
  const login = await (await fetch(`http://localhost:${WEB_PORT}/login`)).text();
  check('web login page renders', login.includes('Sign in'));
} finally {
  api.kill();
  web.kill();
  await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.$disconnect();
}

process.exit(failures === 0 ? 0 : 1);
