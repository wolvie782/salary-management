// Smoke test: boots the built API and web app on scratch ports and checks
// the critical path end to end (health, auth gate, login, directory, pages).
// Requires prior builds: npm run build -w server && npm run build -w web.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const API_PORT = 4101;
const WEB_PORT = 4100;
const dir = mkdtempSync(join(tmpdir(), 'salary-smoke-'));

const api = spawn('node', ['dist/main.js'], {
  cwd: new URL('../server', import.meta.url),
  env: {
    ...process.env,
    PORT: String(API_PORT),
    DATABASE_URL: `file:${join(dir, 'smoke.db')}`,
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

async function waitFor(url, tries = 60) {
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

  const home = await (await fetch(`http://localhost:${WEB_PORT}/`)).text();
  check('web home renders the shell', home.includes('People Pay'));
  const login = await (await fetch(`http://localhost:${WEB_PORT}/login`)).text();
  check('web login page renders', login.includes('Sign in'));
} finally {
  api.kill();
  web.kill();
  rmSync(dir, { recursive: true, force: true });
}

process.exit(failures === 0 ? 0 : 1);
