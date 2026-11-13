'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Overview } from '../lib/api';
import { formatDate, formatMoney, formatUsdCompact } from '../lib/format';
import { CountryChart, DepartmentChart, DistributionChart } from '../components/Charts';

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [byDepartment, setByDepartment] = useState<any[]>([]);
  const [byCountry, setByCountry] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [topEarners, setTopEarners] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.overview(),
      api.byDepartment(),
      api.byCountry(),
      api.distribution(),
      api.topEarners(8),
    ])
      .then(([o, dept, country, dist, top]) => {
        setOverview(o);
        setByDepartment(dept);
        setByCountry(country);
        setBuckets(dist.buckets);
        setTopEarners(top);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      </main>
    );
  }
  if (!overview) {
    return <main className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-500">Loading dashboard...</main>;
  }

  const stats = [
    {
      label: 'Employees',
      value: overview.headcount.toLocaleString(),
      sub: `${overview.activeCount.toLocaleString()} active, rest on leave or inactive`,
    },
    {
      label: 'Annual payroll',
      value: formatUsdCompact(overview.totalAnnualPayrollUsd),
      sub: `USD, ${overview.paidHeadcount.toLocaleString()} people on payroll (active + on leave)`,
    },
    { label: 'Average salary', value: formatUsdCompact(overview.averageSalaryUsd), sub: 'USD per year, on payroll' },
    {
      label: 'Median salary',
      value: overview.medianSalaryUsd === null ? '-' : formatUsdCompact(overview.medianSalaryUsd),
      sub: 'USD per year, on payroll',
    },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">How ACME pays people</h1>
        <p className="mt-1 text-sm text-slate-500">
          Amounts normalized to USD using an approximate static FX snapshot dated{' '}
          {formatDate(overview.fxSnapshot)}. Local currency amounts are shown where relevant.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <DistributionChart data={buckets} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Highest paid employees</h2>
          <Link href="/employees" className="text-sm text-indigo-600 hover:underline">
            Browse everyone
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th scope="col" className="py-2 font-medium">Name</th>
                <th scope="col" className="py-2 font-medium">Title</th>
                <th scope="col" className="py-2 font-medium">Country</th>
                <th scope="col" className="py-2 text-right font-medium">Salary</th>
                <th scope="col" className="py-2 text-right font-medium">In USD</th>
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
        </div>
      </section>
    </main>
  );
}
