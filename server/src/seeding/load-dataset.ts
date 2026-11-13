// Loads the deterministic demo dataset into an empty database. Used by the
// seed script (npm run seed) and by the API on boot when the database is
// empty, which keeps the free tier demo self healing: the host's ephemeral
// filesystem resets on idle, so the app reseeds itself on the next start.
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { generateDataset } from './generator';

const CHUNK = 1000;

export async function loadDataset(prisma: PrismaClient, log = console.log) {
  const startedAt = Date.now();
  const dataset = generateDataset(10_000, 42);

  log('Clearing existing data...');
  await prisma.salaryRecord.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.fxRate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe('DELETE FROM sqlite_sequence');

  await prisma.department.createMany({
    data: dataset.departments.map((name) => ({ name })),
  });
  const departments = await prisma.department.findMany();
  const departmentId = new Map(departments.map((d) => [d.name, d.id]));

  await prisma.fxRate.createMany({
    data: dataset.fxRates.map((r) => ({
      currency: r.currency,
      usdPerUnit: r.usdPerUnit,
      asOf: r.asOf,
    })),
  });

  log(`Inserting ${dataset.employees.length} employees...`);
  for (let i = 0; i < dataset.employees.length; i += CHUNK) {
    const slice = dataset.employees.slice(i, i + CHUNK);
    await prisma.employee.createMany({
      data: slice.map((e) => ({
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
      })),
    });
  }

  const employeeRows = await prisma.employee.findMany({
    select: { id: true, employeeCode: true },
  });
  const idByCode = new Map(employeeRows.map((e) => [e.employeeCode, e.id]));

  const salaryRows = dataset.employees.flatMap((e) =>
    e.salaries.map((s) => ({
      employeeId: idByCode.get(e.employeeCode)!,
      amount: s.amount,
      currency: s.currency,
      effectiveFrom: s.effectiveFrom,
      effectiveTo: s.effectiveTo,
      reason: s.reason,
    })),
  );

  log(`Inserting ${salaryRows.length} salary records...`);
  for (let i = 0; i < salaryRows.length; i += CHUNK) {
    await prisma.salaryRecord.createMany({ data: salaryRows.slice(i, i + CHUNK) });
  }

  // Demo HR login. Credentials come from env so a real deployment sets its
  // own; the defaults exist so a fresh local checkout works out of the box.
  const hrEmail = (process.env.HR_EMAIL ?? 'hr@acme.example').toLowerCase();
  const hrPassword = process.env.HR_PASSWORD ?? 'acme-demo-password';
  await prisma.user.create({
    data: {
      email: hrEmail,
      name: 'ACME HR Manager',
      passwordHash: await bcrypt.hash(hrPassword, 10),
    },
  });

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  log(`Seed complete in ${seconds}s: ${dataset.departments.length} departments, ${dataset.employees.length} employees, ${salaryRows.length} salary records, ${dataset.fxRates.length} FX rates, 1 HR user.`);
}
