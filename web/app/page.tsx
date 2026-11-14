'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, Overview } from '../lib/api';
import { formatDate, formatMoney, formatUsdCompact, countryName, avatarColor } from '../lib/format';
import { CountryChart, DepartmentChart, DistributionChart } from '../components/Charts';
import { LoadingNote } from '../components/Loader';

export default function Dashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [byDepartment, setByDepartment] = useState<{ department: string; totalUsd: number; headcount: number; averageUsd: number }[]>([]);
  const [byCountry, setByCountry] = useState<{ country: string; averageUsd: number; headcount: number }[]>([]);
  const [buckets, setBuckets] = useState<{ label: string; count: number }[]>([]);
  const [topEarners, setTopEarners] = useState<{ id: number; name: string; jobTitle: string; country: string; amount: number; currency: string; usd: number }[]>([]);
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
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="shrink-0 text-red-500" width="16" height="16">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      </main>
    );
  }

  if (!overview) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <LoadingNote label="Loading live compensation data…" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse" />
          <div className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse" />
        </div>
      </main>
    );
  }

  const stats = [
    {
      label: 'Total Employees',
      value: overview.headcount.toLocaleString(),
      sub: `${overview.activeCount.toLocaleString()} active · ${(overview.headcount - overview.activeCount).toLocaleString()} inactive`,
      accent: 'border-indigo-500',
      iconBg: 'bg-indigo-50 text-indigo-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Annual Payroll',
      value: formatUsdCompact(overview.totalAnnualPayrollUsd),
      sub: `${overview.paidHeadcount.toLocaleString()} employees on payroll · USD`,
      accent: 'border-violet-500',
      iconBg: 'bg-violet-50 text-violet-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      label: 'Average Salary',
      value: formatUsdCompact(overview.averageSalaryUsd),
      sub: 'USD per year, on payroll',
      accent: 'border-teal-500',
      iconBg: 'bg-teal-50 text-teal-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      ),
    },
    {
      label: 'Median Salary',
      value: overview.medianSalaryUsd === null ? '—' : formatUsdCompact(overview.medianSalaryUsd),
      sub: 'USD per year, on payroll',
      accent: 'border-amber-500',
      iconBg: 'bg-amber-50 text-amber-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M12 3v18" />
          <path d="M3 9l4 7H3l4-7z" />
          <path d="M17 9l4 7h-8l4-7z" />
          <path d="M5 20h14" />
        </svg>
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 sm:space-y-8 px-4 sm:px-6 py-6 sm:py-8">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">ACME People Pay</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Compensation Overview</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            All amounts normalised to USD · FX snapshot{' '}
            {overview.fxSnapshot ? formatDate(overview.fxSnapshot) : 'N/A'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live data
        </div>
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-t-4 ${s.accent}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{s.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.iconBg}`}>
                {s.icon}
              </div>
            </div>
            <div className="mt-3 text-4xl font-bold text-slate-900 tracking-tight">{s.value}</div>
            <div className="mt-1.5 text-xs text-slate-400 leading-relaxed">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Charts */}
      <section>
        <div className="mb-5 flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">Payroll Insights</h2>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Payroll by Department</h3>
            <p className="text-xs text-slate-400 mb-4">Annual total in USD — sorted by payroll</p>
            <div className="overflow-x-auto">
              <div className="min-w-[380px]">
                <DepartmentChart data={byDepartment} />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Average Salary by Country</h3>
            <p className="text-xs text-slate-400 mb-4">USD equivalent per year</p>
            <div className="overflow-x-auto">
              <div className="min-w-[380px]">
                <CountryChart data={byCountry} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Salary Distribution</h3>
        <p className="text-xs text-slate-400 mb-4">USD per year · employees per salary bracket</p>
        <div className="overflow-x-auto">
          <div className="min-w-[380px]">
            <DistributionChart data={buckets} />
          </div>
        </div>
      </section>

      {/* Top earners */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Highest Paid Employees</h3>
            <p className="text-xs text-slate-400 mt-0.5">Top 8 by annual compensation</p>
          </div>
          <Link
            href="/employees"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            View all
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</th>
                <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Country</th>
                <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Local Salary</th>
                <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">In USD</th>
              </tr>
            </thead>
            <tbody>
              {topEarners.map((e, i) => {
                // Rank-based avatar: dark indigo for #1, fading towards lighter as rank drops
                const RANK_COLORS = ['#1e40af','#1e40af','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe'];
                const rankColor = RANK_COLORS[i] ?? '#bfdbfe';
                const rankLabelClass = i === 0
                  ? 'text-amber-500 font-bold'
                  : i === 1
                  ? 'text-slate-400 font-semibold'
                  : i === 2
                  ? 'text-orange-400 font-semibold'
                  : 'text-slate-300 font-medium';

                return (
                  <tr
                    key={e.id}
                    onClick={() => router.push(`/employees/${e.id}`)}
                    className="border-t border-slate-100 hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 text-sm text-right shrink-0 ${rankLabelClass}`}>
                          {i + 1}
                        </span>
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: rankColor }}
                        >
                          {e.name.trim().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            {e.name}
                          </div>
                          <div className="text-xs text-slate-400">{e.jobTitle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{countryName(e.country)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{formatMoney(e.amount, e.currency)}</td>
                    <td className="px-5 py-3.5 text-right text-slate-400">{formatMoney(e.usd, 'USD')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
