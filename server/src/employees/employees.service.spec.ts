// Integration tests for EmployeesService against a throwaway SQLite database.
// They cover the behavior HR relies on: finding people, and recording salary
// changes without losing history. Fast because the dataset is tiny and local.
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { generateDataset } from '../seeding/generator';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  let dir: string;
  let prisma: PrismaClient;
  let service: EmployeesService;
  let engineeringId: number;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'salary-test-'));
    process.env.DATABASE_URL = `file:${join(dir, 'test.db')}`;
    execSync('npx prisma db push --skip-generate', {
      cwd: join(__dirname, '..', '..'),
      env: { ...process.env },
      stdio: 'ignore',
    });

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
    rmSync(dir, { recursive: true, force: true });
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
