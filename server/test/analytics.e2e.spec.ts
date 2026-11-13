// End to end proof that every analytics endpoint works against PostgreSQL,
// including the raw SQL aggregations and a parallel burst from one caller,
// which exercises the shared rate limiter's cold-key race.
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let token: string;

  beforeAll(async () => {
    // Isolated, freshly dropped schema in the shared test database; see
    // the README for the local Postgres setup.
    const base = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/salary_test';
    const admin = new PrismaClient({ datasources: { db: { url: base } } });
    await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "analytics_e2e" CASCADE');
    await admin.$executeRawUnsafe('CREATE SCHEMA "analytics_e2e"');
    await admin.$disconnect();
    process.env.DATABASE_URL = `${base}?schema=analytics_e2e`;
    execSync('npx prisma db push --skip-generate', {
      cwd: join(__dirname, '..'),
      env: { ...process.env },
      stdio: 'ignore',
    });

    prisma = new PrismaClient();
    const department = await prisma.department.create({ data: { name: 'Engineering' } });
    await prisma.fxRate.createMany({
      data: [
        { currency: 'USD', usdPerUnit: 1, asOf: new Date('2026-01-01') },
        { currency: 'INR', usdPerUnit: 0.012, asOf: new Date('2026-01-01') },
      ],
    });
    const employees = await Promise.all(
      [
        { code: 'E001', country: 'United States', currency: 'USD', amount: 120_000 },
        { code: 'E002', country: 'United States', currency: 'USD', amount: 90_000 },
        { code: 'E003', country: 'India', currency: 'INR', amount: 3_000_000 },
      ].map((e) =>
        prisma.employee.create({
          data: {
            employeeCode: e.code,
            firstName: 'Test',
            lastName: e.code,
            email: `${e.code.toLowerCase()}@acme.example`,
            jobTitle: 'Engineer',
            employmentType: 'FULL_TIME',
            status: 'ACTIVE',
            country: e.country,
            currency: e.currency,
            hireDate: new Date('2024-01-01'),
            departmentId: department.id,
            salaries: {
              create: {
                amount: e.amount,
                currency: e.currency,
                effectiveFrom: new Date('2025-01-01'),
                reason: 'Initial',
              },
            },
          },
        }),
      ),
    );
    expect(employees).toHaveLength(3);
    await prisma.user.create({
      data: {
        email: 'hr@acme.example',
        name: 'HR Manager',
        passwordHash: await bcrypt.hash('correct-password', 10),
      },
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'hr@acme.example', password: 'correct-password' })
      .expect(201);
    token = login.body.accessToken;
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('overview returns the org totals', async () => {
    const res = await request(app.getHttpServer())
      .get('/analytics/overview')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.headcount).toBe(3);
    expect(res.body.paidHeadcount).toBe(3);
    expect(res.body.totalAnnualPayrollUsd).toBeGreaterThan(0);
  });

  it('by-department aggregates through the department join', async () => {
    const res = await request(app.getHttpServer())
      .get('/analytics/by-department')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].department).toBe('Engineering');
    expect(res.body[0].headcount).toBe(3);
  });

  it('by-country groups by country and currency', async () => {
    const res = await request(app.getHttpServer())
      .get('/analytics/by-country')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const countries = res.body.map((r: { country: string }) => r.country).sort();
    expect(countries).toEqual(['India', 'United States']);
    const us = res.body.find((r: { country: string }) => r.country === 'United States');
    expect(us.headcount).toBe(2);
    expect(us.currency).toBe('USD');
  });

  it('distribution returns salary buckets', async () => {
    const res = await request(app.getHttpServer())
      .get('/analytics/distribution')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body.buckets)).toBe(true);
  });

  it('top-earners returns ranked earners', async () => {
    const res = await request(app.getHttpServer())
      .get('/analytics/top-earners')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toContain('Test');
  });

  it('serves a parallel burst from one caller without errors', async () => {
    // The dashboard fires several requests at once on load; every one must
    // pass the shared rate limiter even when the key row is cold.
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        request(app.getHttpServer())
          .get('/analytics/overview')
          .set('Authorization', `Bearer ${token}`),
      ),
    );
    for (const res of results) {
      expect(res.status).toBe(200);
    }
  });
});
