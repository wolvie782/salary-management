// End to end proof that salary data and mutations sit behind sign in.
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Isolated, freshly dropped schema in the shared test database; see
    // the README for the local Postgres setup.
    const base = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/salary_test';
    const admin = new PrismaClient({ datasources: { db: { url: base } } });
    await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "auth_e2e" CASCADE');
    await admin.$executeRawUnsafe('CREATE SCHEMA "auth_e2e"');
    await admin.$disconnect();
    process.env.DATABASE_URL = `${base}?schema=auth_e2e`;
    execSync('npx prisma db push --skip-generate', {
      cwd: join(__dirname, '..'),
      env: { ...process.env },
      stdio: 'ignore',
    });

    prisma = new PrismaClient();
    await prisma.department.create({ data: { name: 'Engineering' } });
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
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('health check is public', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('rejects reads without a token', () => {
    return request(app.getHttpServer()).get('/employees').expect(401);
  });

  it('rejects mutations without a token', () => {
    return request(app.getHttpServer())
      .post('/employees')
      .send({ firstName: 'No' })
      .expect(401);
  });

  it('rejects analytics without a token', () => {
    return request(app.getHttpServer()).get('/analytics/overview').expect(401);
  });

  it('rejects a wrong password without revealing which part failed', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'hr@acme.example', password: 'wrong-password' })
      .expect(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects an unknown email with the same message', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nobody@acme.example', password: 'whatever' })
      .expect(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('issues a token for the right credentials and accepts it', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'hr@acme.example', password: 'correct-password' })
      .expect(201);
    const token = login.body.accessToken;
    expect(token).toBeTruthy();

    await request(app.getHttpServer())
      .get('/employees')
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    const created = await request(app.getHttpServer())
      .post('/employees')
      .set('authorization', `Bearer ${token}`)
      .send({
        firstName: 'Ada',
        lastName: 'Lane',
        email: 'ada.lane@acme.example',
        jobTitle: 'Engineer',
        employmentType: 'FULL_TIME',
        country: 'IN',
        currency: 'INR',
        departmentId: 1,
        hireDate: '2026-11-01',
        salaryAmount: 2_000_000,
      })
      .expect(201);
    expect(created.body.employeeCode).toBe('ACME-000001');
  });
});

describe('Error handling (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const base = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/salary_test';
    const admin = new PrismaClient({ datasources: { db: { url: base } } });
    await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "errors_e2e" CASCADE');
    await admin.$executeRawUnsafe('CREATE SCHEMA "errors_e2e"');
    await admin.$disconnect();
    process.env.DATABASE_URL = `${base}?schema=errors_e2e`;
    execSync('npx prisma db push --skip-generate', {
      cwd: join(__dirname, '..'),
      env: { ...process.env },
      stdio: 'ignore',
    });
    const prisma = new PrismaClient();
    await prisma.department.create({ data: { name: 'Engineering' } });
    await prisma.user.create({
      data: {
        email: 'hr@acme.example',
        name: 'HR Manager',
        passwordHash: await bcrypt.hash('correct-password', 10),
      },
    });
    await prisma.$disconnect();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'hr@acme.example', password: 'correct-password' });
    token = login.body.accessToken;
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('returns field level 400s for invalid input, no stack traces', async () => {
    const res = await request(app.getHttpServer())
      .post('/employees')
      .set('authorization', `Bearer ${token}`)
      .send({ firstName: 'Only' })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
    expect(Array.isArray(res.body.message)).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('at ');
    expect(JSON.stringify(res.body)).not.toContain('node_modules');
  });

  it('returns a clean 409 for a duplicate email', async () => {
    const payload = {
      firstName: 'One',
      lastName: 'Person',
      email: 'dupe@acme.example',
      jobTitle: 'Engineer',
      employmentType: 'FULL_TIME',
      country: 'IN',
      currency: 'INR',
      departmentId: 1,
      hireDate: '2026-11-01',
      salaryAmount: 1_000_000,
    };
    await request(app.getHttpServer())
      .post('/employees')
      .set('authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/employees')
      .set('authorization', `Bearer ${token}`)
      .send(payload)
      .expect(409);
    expect(JSON.stringify(res.body)).not.toContain('Prisma');
  });

  it('returns 400, not 500, for malformed JSON', async () => {
    const res = await request(app.getHttpServer())
      .post('/employees')
      .set('authorization', `Bearer ${token}`)
      .set('content-type', 'application/json')
      .send('{not valid json')
      .expect(400);
    expect(res.body.message).toBe('Malformed request body');
  });

  it('returns 404 for unknown routes and unknown employees', async () => {
    await request(app.getHttpServer())
      .get('/no-such-route')
      .set('authorization', `Bearer ${token}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/employees/999999')
      .set('authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('rejects expired or forged tokens with 401', () => {
    return request(app.getHttpServer())
      .get('/employees')
      .set('authorization', 'Bearer forged.token.value')
      .expect(401);
  });
});
