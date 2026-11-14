import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FxTable, bucketize, median } from '../common/money';

// Analytics answer "how does the org pay people" questions. They run as set
// based SQL aggregations rather than loading rows into memory, so they stay
// fast as headcount grows past 10k. FX normalization to USD joins the static
// FxRate snapshot table.

interface CurrencyRow {
  currency: string;
  headcount: bigint;
  total_local: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async fxTable(): Promise<FxTable> {
    const rates = await this.prisma.fxRate.findMany();
    return Object.fromEntries(rates.map((r) => [r.currency, Number(r.usdPerUnit)]));
  }

  // Current (open ended) salary records joined with FX, one row per employee.
  private currentSalarySql(
    select: string,
    opts: { extraJoins?: string; where: string; tail?: string },
  ): string {
    return `
      ${select}
      FROM "SalaryRecord" s
      JOIN "Employee" e ON e.id = s."employeeId"
      JOIN "FxRate" f ON f.currency = s.currency
      ${opts.extraJoins ?? ''}
      WHERE ${opts.where}
      ${opts.tail ?? ''}`;
  }

  async overview() {
    // These six reads are independent: run them concurrently so the request
    // pays one network round trip to the database instead of six sequential
    // ones. This matters on the hosted demo, where function and database can
    // be regions apart and each round trip costs hundreds of milliseconds.
    const [fx, headcount, activeCount, perCurrency, usdValues, fxSnapshot] = await Promise.all([
      this.fxTable(),
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.$queryRawUnsafe<CurrencyRow[]>(
        this.currentSalarySql(
          'SELECT s.currency AS currency, COUNT(*) AS headcount, SUM(CAST(s.amount AS REAL)) AS total_local',
          { where: `s."effectiveTo" IS NULL AND e.status != 'INACTIVE'`, tail: 'GROUP BY s.currency' },
        ),
      ),
      this.currentUsdValues(),
      this.prisma.fxRate.findFirst({ select: { asOf: true } }),
    ]);

    let totalUsd = 0;
    let paidHeadcount = 0;
    for (const row of perCurrency) {
      totalUsd += row.total_local * fx[row.currency];
      paidHeadcount += Number(row.headcount);
    }

    const medianUsd = median(usdValues);

    return {
      headcount,
      activeCount,
      paidHeadcount,
      totalAnnualPayrollUsd: Math.round(totalUsd),
      averageSalaryUsd: paidHeadcount ? Math.round(totalUsd / paidHeadcount) : 0,
      medianSalaryUsd: medianUsd === null ? null : Math.round(medianUsd),
      fxSnapshot: fxSnapshot?.asOf ?? null,
    };
  }

  async byDepartment() {
    const rows = await this.prisma.$queryRawUnsafe<
      { department: string; headcount: bigint; total_usd: number; avg_usd: number }[]
    >(
      this.currentSalarySql(
        `SELECT d.name AS department, COUNT(*) AS headcount,
                SUM(CAST(s.amount AS REAL) * CAST(f."usdPerUnit" AS REAL)) AS total_usd,
                AVG(CAST(s.amount AS REAL) * CAST(f."usdPerUnit" AS REAL)) AS avg_usd`,
        {
          extraJoins: 'JOIN "Department" d ON d.id = e."departmentId"',
          where: `s."effectiveTo" IS NULL AND e.status != 'INACTIVE'`,
          tail: 'GROUP BY d.name ORDER BY total_usd DESC',
        },
      ),
    );
    return rows.map((r) => ({
      department: r.department,
      headcount: Number(r.headcount),
      totalUsd: Math.round(r.total_usd),
      averageUsd: Math.round(r.avg_usd),
    }));
  }

  async byCountry() {
    const rows = await this.prisma.$queryRawUnsafe<
      { country: string; currency: string; headcount: bigint; avg_local: number; avg_usd: number }[]
    >(
      this.currentSalarySql(
        `SELECT e.country AS country, s.currency AS currency, COUNT(*) AS headcount,
                AVG(CAST(s.amount AS REAL)) AS avg_local,
                AVG(CAST(s.amount AS REAL) * CAST(f."usdPerUnit" AS REAL)) AS avg_usd`,
        {
          where: `s."effectiveTo" IS NULL AND e.status != 'INACTIVE'`,
          tail: 'GROUP BY e.country, s.currency ORDER BY headcount DESC',
        },
      ),
    );
    return rows.map((r) => ({
      country: r.country,
      currency: r.currency,
      headcount: Number(r.headcount),
      averageLocal: Math.round(r.avg_local),
      averageUsd: Math.round(r.avg_usd),
    }));
  }

  async distribution() {
    const values = await this.currentUsdValues();
    return {
      widthUsd: 10_000,
      capUsd: 250_000,
      buckets: bucketize(values, 10_000, 250_000),
    };
  }

  async topEarners(limit = 10) {
    const rows = await this.prisma.$queryRawUnsafe<
      {
        id: number;
        firstName: string;
        lastName: string;
        jobTitle: string;
        country: string;
        amount: number;
        currency: string;
        usd: number;
      }[]
    >(
      this.currentSalarySql(
        `SELECT e.id, e."firstName", e."lastName", e."jobTitle", e.country,
                CAST(s.amount AS REAL) AS amount, s.currency,
                CAST(s.amount AS REAL) * CAST(f."usdPerUnit" AS REAL) AS usd`,
        {
          where: `s."effectiveTo" IS NULL AND e.status != 'INACTIVE'`,
          tail: `ORDER BY usd DESC LIMIT ${Math.min(Math.max(1, limit), 100)}`,
        },
      ),
    );
    return rows.map((r) => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`,
      jobTitle: r.jobTitle,
      country: r.country,
      amount: Math.round(r.amount),
      currency: r.currency,
      usd: Math.round(r.usd),
    }));
  }

  private async currentUsdValues(): Promise<number[]> {
    const rows = await this.prisma.$queryRawUnsafe<{ usd: number }[]>(
      this.currentSalarySql(
        'SELECT CAST(s.amount AS REAL) * CAST(f."usdPerUnit" AS REAL) AS usd',
        { where: `s."effectiveTo" IS NULL AND e.status != 'INACTIVE'`, tail: 'ORDER BY usd' },
      ),
    );
    return rows.map((r) => r.usd);
  }
}
