// End to end proof that salary data and mutations sit behind sign in.
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let dir: string;
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'salary-auth-'));
    process.env.DATABASE_URL = `file:${join(dir, 'test.db')}`;
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
    rmSync(dir, { recursive: true, force: true });
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
