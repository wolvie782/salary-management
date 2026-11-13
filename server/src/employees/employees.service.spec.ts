// Integration tests for EmployeesService against a throwaway Postgres schema.
// They cover the behavior HR relies on: finding people, and recording salary
// changes without losing history. They need a reachable Postgres; see the
// README (docker compose up -d db) and TEST_DATABASE_URL.
import { execSync } from 'node:child_process';
import { join } from 'node:path';

// Each suite gets its own freshly dropped schema in the test database, so
// suites stay isolated and can run in parallel workers without colliding.
async function useTestSchema(schema: string) {
  const base = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/salary_test';
  const admin = new PrismaClient({ datasources: { db: { url: base } } });
  await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  await admin.$disconnect();
  process.env.DATABASE_URL = `${base}?schema=${schema}`;
  execSync('npx prisma db push --skip-generate', {
    cwd: join(__dirname, '..', '..'),
    env: { ...process.env },
    stdio: 'ignore',
  });
}
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { generateDataset } from '../seeding/generator';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  let prisma: PrismaClient;
  let service: EmployeesService;
  let engineeringId: number;

  beforeAll(async () => {
    await useTestSchema('employees');

    prisma = new PrismaService();
    service = new EmployeesService(prisma as PrismaService);

    const dataset = generateDataset(120, 99);
    await prisma.department.createMany({ data: dataset.departments.map((name) => ({ name })) });
    const departments = await prisma.department.findMany();
    engineeringId = departments.find((d) => d.name === 'Engineering')!.id;
    const departmentId = new Map(departments.map((d) => [d.name, d.id]));
    await prisma.fxRate.createMany({
      data: dataset.fxRates.map((r) => ({ ...r })),
    });
    for (const e of dataset.employees) {
      await prisma.employee.create({
        data: {
          employeeCode: e.employeeCode,
          firstName: e.firstName,
          lastName: e.lastName,
          email: e.email,
          jobTitle: e.jobTitle,
          employmentType: e.employmentType,
          status: e.status,
          country: e.country,
          currency: e.currency,
          hireDate: e.hireDate,
          departmentId: departmentId.get(e.department)!,
          salaries: {
            create: e.salaries.map((s) => ({
              amount: s.amount,
              currency: s.currency,
              effectiveFrom: s.effectiveFrom,
              effectiveTo: s.effectiveTo,
              reason: s.reason,
            })),
          },
        },
      });
    }
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('paginates the directory', async () => {
    const page1 = await service.list({ page: 1, pageSize: 25 } as any);
    expect(page1.total).toBe(120);
    expect(page1.data).toHaveLength(25);
    expect(page1.totalPages).toBe(5);
    const page5 = await service.list({ page: 5, pageSize: 25 } as any);
    expect(page5.data).toHaveLength(20);
  });

  it('searches by name and by employee code', async () => {
    const anyEmployee = await prisma.employee.findFirstOrThrow();
    const byName = await service.list({ search: anyEmployee.firstName } as any);
    expect(byName.total).toBeGreaterThan(0);
    const byCode = await service.list({ search: anyEmployee.employeeCode } as any);
    expect(byCode.total).toBe(1);
    expect(byCode.data[0].id).toBe(anyEmployee.id);
  });

  it('filters by department and country together', async () => {
    const res = await service.list({ department: 'Engineering', country: 'IN', pageSize: 100 } as any);
    expect(res.data.length).toBeGreaterThan(0);
    for (const row of res.data) {
      expect(row.department).toBe('Engineering');
      expect(row.country).toBe('IN');
    }
  });

  it('creates an employee with an initial salary and sequential code', async () => {
    const created = await service.create({
      firstName: 'New',
      lastName: 'Hire',
      email: 'new.hire@acme.example',
      jobTitle: 'Software Engineer',
      employmentType: 'FULL_TIME',
      country: 'US',
      currency: 'USD',
      departmentId: engineeringId,
      hireDate: '2026-11-01',
      salaryAmount: 130_000,
    } as any);
    expect(created.employeeCode).toBe('ACME-000121');
    expect(created.salaryHistory).toHaveLength(1);
    expect(created.salaryHistory[0].reason).toBe('HIRE');
    expect(Number(created.salaryHistory[0].amount)).toBe(130_000);
  });

  it('rejects a duplicate email', async () => {
    await expect(
      service.create({
        firstName: 'Dupe',
        lastName: 'Hire',
        email: 'new.hire@acme.example',
        jobTitle: 'Engineer',
        employmentType: 'FULL_TIME',
        country: 'US',
        currency: 'USD',
        departmentId: engineeringId,
        hireDate: '2026-11-01',
        salaryAmount: 100_000,
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('records a salary change by closing the open record, never overwriting it', async () => {
    const target = await prisma.employee.findFirstOrThrow({ where: { email: 'new.hire@acme.example' } });
    const updated = await service.addSalaryChange(target.id, {
      amount: 150_000,
      effectiveFrom: '2026-11-10',
      reason: 'PROMOTION',
    } as any);

    expect(updated.salaryHistory).toHaveLength(2);
    const [current, previous] = updated.salaryHistory; // service returns newest first
    expect(Number(current.amount)).toBe(150_000);
    expect(current.effectiveTo).toBeNull();
    expect(new Date(previous.effectiveTo).getTime()).toBe(
      new Date(current.effectiveFrom).getTime() - 24 * 3600 * 1000,
    );
    // still exactly one open record
    const open = await prisma.salaryRecord.count({
      where: { employeeId: target.id, effectiveTo: null },
    });
    expect(open).toBe(1);
  });

  it('rejects a change dated before the current salary started', async () => {
    const target = await prisma.employee.findFirstOrThrow({ where: { email: 'new.hire@acme.example' } });
    await expect(
      service.addSalaryChange(target.id, {
        amount: 160_000,
        effectiveFrom: '2020-01-01',
        reason: 'CORRECTION',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException for unknown employees', async () => {
    await expect(service.byId(999_999)).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.addSalaryChange(999_999, { amount: 1, effectiveFrom: '2026-01-01', reason: 'HIRE' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('EmployeesService invariants under stress', () => {
  let prisma: PrismaClient;
  let service: EmployeesService;
  let employeeId: number;

  beforeAll(async () => {
    await useTestSchema('employees_race');
    prisma = new PrismaClient();
    service = new EmployeesService(prisma as PrismaService);
    const dept = await prisma.department.create({ data: { name: 'Engineering' } });
    const employee = await prisma.employee.create({
      data: {
        employeeCode: 'ACME-000001',
        firstName: 'Race',
        lastName: 'Test',
        email: 'race@acme.example',
        jobTitle: 'Engineer',
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        country: 'IN',
        currency: 'INR',
        hireDate: new Date('2020-01-01'),
        departmentId: dept.id,
        salaries: {
          create: {
            amount: 1_000_000,
            currency: 'INR',
            effectiveFrom: new Date('2020-01-01'),
            reason: 'HIRE',
          },
        },
      },
    });
    employeeId = employee.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('keeps exactly one open record when two changes race with the same date', async () => {
    const change = {
      amount: 1_200_000,
      effectiveFrom: '2026-11-10',
      reason: 'ANNUAL_REVIEW',
    } as any;
    const results = await Promise.allSettled([
      service.addSalaryChange(employeeId, change),
      service.addSalaryChange(employeeId, change),
    ]);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    expect(succeeded.length).toBeLessThanOrEqual(1);

    const open = await prisma.salaryRecord.count({
      where: { employeeId, effectiveTo: null },
    });
    expect(open).toBe(1);

    const all = await prisma.salaryRecord.findMany({ where: { employeeId } });
    const sorted = [...all].sort(
      (a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime(),
    );
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].effectiveTo).not.toBeNull();
    }
  });
});
