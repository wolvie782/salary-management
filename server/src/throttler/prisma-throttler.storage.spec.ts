// Concurrency proof for the Postgres backed rate limiter: simultaneous
// increments on the same key must serialize, never error, and never lose a
// hit. This covers the cold-key race a dashboard page load creates.
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaThrottlerStorage } from './prisma-throttler.storage';

describe('PrismaThrottlerStorage', () => {
  let prisma: PrismaClient;
  let storage: PrismaThrottlerStorage;

  beforeAll(async () => {
    const base = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/salary_test';
    const admin = new PrismaClient({ datasources: { db: { url: base } } });
    await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "throttler_spec" CASCADE');
    await admin.$executeRawUnsafe('CREATE SCHEMA "throttler_spec"');
    await admin.$disconnect();
    process.env.DATABASE_URL = `${base}?schema=throttler_spec`;
    execSync('npx prisma db push --skip-generate', {
      cwd: join(__dirname, '..', '..'),
      env: { ...process.env },
      stdio: 'ignore',
    });
    prisma = new PrismaClient();
    storage = new PrismaThrottlerStorage(prisma as unknown as PrismaService);
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('counts every hit when 20 increments race on a cold key', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        storage.increment('cold-key', 60_000, 1_000, 0, 'global'),
      ),
    );
    const totals = results.map((r) => r.totalHits).sort((a, b) => a - b);
    expect(totals).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    const row = await prisma.throttleRecord.findUnique({ where: { key: 'global:cold-key' } });
    expect(row?.totalHits).toBe(20);
  });

  it('blocks after the limit and reports the block', async () => {
    const first = await storage.increment('limited-key', 60_000, 2, 30_000, 'login');
    const second = await storage.increment('limited-key', 60_000, 2, 30_000, 'login');
    const third = await storage.increment('limited-key', 60_000, 2, 30_000, 'login');
    expect(first.isBlocked).toBe(false);
    expect(second.isBlocked).toBe(false);
    expect(third.isBlocked).toBe(true);
    expect(third.timeToBlockExpire).toBeGreaterThan(0);
  });

  it('resets the window after expiry', async () => {
    await storage.increment('expiring-key', 1, 10, 0, 'global');
    await new Promise((resolve) => setTimeout(resolve, 20));
    const after = await storage.increment('expiring-key', 60_000, 10, 0, 'global');
    expect(after.totalHits).toBe(1);
  });
});
