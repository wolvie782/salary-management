'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, EmployeeListItem, Filters, Paged } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { StatusBadge } from '../../components/StatusBadge';

const PAGE_SIZE = 25;

export default function EmployeesPage() {
  const [filters, setFilters] = useState<Filters | null>(null);
  const [result, setResult] = useState<Paged<EmployeeListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    api.filters().then(setFilters).catch((e) => setError(e.message));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listEmployees({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        department,
        country,
        status,
      })
      .then((r) => {
        setResult(r);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, department, country, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, department, country, status]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">
            {result ? `${result.total.toLocaleString()} people` : 'Loading...'}
          </p>
        </div>
        <Link
          href="/employees/new"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add employee
        </Link>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or code"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All departments</option>
          {filters?.departments.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All countries</option>
          {filters?.countries.map((c) => (
            <option key={c.code} value={c.code}>{c.code}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Any status</option>
          {filters?.statuses.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-slate-500">
              <th scope="col" className="px-4 py-3 font-medium">Employee</th>
              <th scope="col" className="px-4 py-3 font-medium">Code</th>
              <th scope="col" className="px-4 py-3 font-medium">Title</th>
              <th scope="col" className="px-4 py-3 font-medium">Department</th>
              <th scope="col" className="px-4 py-3 font-medium">Country</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Salary</th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {result?.data.map((e) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/employees/${e.id}`} className="font-medium text-indigo-600 hover:underline">
                    {e.firstName} {e.lastName}
                  </Link>
                  <div className="text-xs text-slate-400">{e.email}</div>
                </td>
                <td className="px-4 py-2.5 text-slate-500">{e.employeeCode}</td>
                <td className="px-4 py-2.5">{e.jobTitle}</td>
                <td className="px-4 py-2.5">{e.department}</td>
                <td className="px-4 py-2.5">{e.country}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={e.status} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  {e.currentSalary ? formatMoney(e.currentSalary.amount, e.currentSalary.currency) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-500">
          Page {result?.page ?? 1} of {result?.totalPages ?? 1}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!result || page >= result.totalPages}
            className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}

