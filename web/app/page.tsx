import { api } from '../lib/api';
import { formatDate, formatMoney, formatUsdCompact } from '../lib/format';
import { CountryChart, DepartmentChart, DistributionChart } from '../components/Charts';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [overview, byDepartment, byCountry, distribution, topEarners] = await Promise.all([
    api.overview(),
    api.byDepartment(),
    api.byCountry(),
    api.distribution(),
    api.topEarners(8),
  ]);

  const stats = [
    { label: 'Employees', value: overview.headcount.toLocaleString(), sub: `${overview.activeCount.toLocaleString()} active` },
    { label: 'Annual payroll', value: formatUsdCompact(overview.totalAnnualPayrollUsd), sub: 'USD, all countries' },
    { label: 'Average salary', value: formatUsdCompact(overview.averageSalaryUsd), sub: 'USD per year' },
    { label: 'Median salary', value: overview.medianSalaryUsd === null ? '-' : formatUsdCompact(overview.medianSalaryUsd), sub: 'USD per year' },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">How ACME pays people</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live view over {overview.paidHeadcount.toLocaleString()} paid employees. Amounts in USD
            using the FX snapshot of {formatDate(overview.fxSnapshot)}.
          </p>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold">{s.value}</div>
            <div className="mt-1 text-xs text-slate-400">{s.sub}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-medium">Payroll by department</h2>
          <DepartmentChart data={byDepartment} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-medium">Average salary by country</h2>
          <CountryChart data={byCountry} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-medium">Salary distribution (USD per year)</h2>
        <DistributionChart data={distribution.buckets} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Highest paid employees</h2>
          <Link href="/employees" className="text-sm text-indigo-600 hover:underline">
            Browse everyone
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Title</th>
              <th className="py-2 font-medium">Country</th>
              <th className="py-2 text-right font-medium">Salary</th>
              <th className="py-2 text-right font-medium">In USD</th>
            </tr>
          </thead>
          <tbody>
            {topEarners.map((e) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="py-2">
                  <Link href={`/employees/${e.id}`} className="text-indigo-600 hover:underline">
                    {e.name}
                  </Link>
                </td>
                <td className="py-2">{e.jobTitle}</td>
                <td className="py-2">{e.country}</td>
                <td className="py-2 text-right">{formatMoney(e.amount, e.currency)}</td>
                <td className="py-2 text-right text-slate-500">{formatMoney(e.usd, 'USD')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
