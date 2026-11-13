'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, EmployeeListItem, Filters, Paged } from '../../lib/api';
import { formatMoney, countryName, avatarColor } from '../../lib/format';
import { StatusBadge } from '../../components/StatusBadge';
import { Select } from '../../components/Select';
import { getToken } from '../../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function exportToCsv(params: { search: string; department: string; country: string; status: string }) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const token = getToken();
  const res = await fetch(`${API_URL}/employees/export?${qs}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- CSV Import helpers ----
interface CsvRow {
  firstName: string; lastName: string; email: string; jobTitle: string;
  country: string; currency: string; departmentId: string;
  hireDate: string; salaryAmount: string; employmentType: string;
  _error?: string;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase().replace(/\s+/g, ''));
  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    // Map common CSV header aliases
    return {
      firstName: obj['firstname'] ?? obj['first_name'] ?? '',
      lastName: obj['lastname'] ?? obj['last_name'] ?? '',
      email: obj['email'] ?? '',
      jobTitle: obj['jobtitle'] ?? obj['job_title'] ?? obj['title'] ?? '',
      country: (obj['country'] ?? '').toUpperCase().slice(0, 2),
      currency: (obj['currency'] ?? '').toUpperCase(),
      departmentId: obj['departmentid'] ?? obj['department_id'] ?? '',
      hireDate: obj['hiredate'] ?? obj['hire_date'] ?? '',
      salaryAmount: obj['salaryamount'] ?? obj['salary_amount'] ?? obj['salary'] ?? '',
      employmentType: (obj['employmenttype'] ?? obj['employment_type'] ?? 'FULL_TIME').toUpperCase().replace(/\s+/g, '_'),
    };
  });
}

const PAGE_SIZE = 25;

export default function EmployeesPage() {
  const router = useRouter();
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
  const [exporting, setExporting] = useState(false);

  // Import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<CsvRow[]>([]);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

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
      .listEmployees({ page, pageSize: PAGE_SIZE, search: debouncedSearch, department, country, status })
      .then((r) => { setResult(r); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, department, country, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch, department, country, status]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target?.result as string);
      setImportRows(rows);
      setImportProgress(null);
    };
    reader.readAsText(file);
  }

  async function runImport() {
    if (!filters) return;
    setImporting(true);
    const errors: string[] = [];
    let done = 0;
    setImportProgress({ done: 0, total: importRows.length, errors: [] });

    for (const row of importRows) {
      try {
        // Map departmentId: try numeric first, then match by name
        let deptId = Number(row.departmentId);
        if (isNaN(deptId) || deptId === 0) {
          const match = filters.departments.find((d) => d.name.toLowerCase() === row.departmentId.toLowerCase());
          if (!match) { errors.push(`Row ${done + 1}: unknown department "${row.departmentId}"`); done++; setImportProgress({ done, total: importRows.length, errors: [...errors] }); continue; }
          deptId = match.id;
        }
        await api.createEmployee({
          firstName: row.firstName, lastName: row.lastName, email: row.email,
          jobTitle: row.jobTitle, country: row.country, currency: row.currency,
          departmentId: deptId, hireDate: row.hireDate,
          salaryAmount: Number(row.salaryAmount), employmentType: row.employmentType,
        });
      } catch (err) {
        errors.push(`Row ${done + 1} (${row.email}): ${err instanceof Error ? err.message : 'failed'}`);
      }
      done++;
      setImportProgress({ done, total: importRows.length, errors: [...errors] });
    }

    setImporting(false);
    load(); // refresh the list
  }

  const start = result ? (result.page - 1) * PAGE_SIZE + 1 : 0;
  const end = result ? Math.min(result.page * PAGE_SIZE, result.total) : 0;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">
            {result ? `${result.total.toLocaleString()} people` : 'Loading…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Import CSV */}
          <button
            onClick={() => { setImportOpen(true); setImportRows([]); setImportProgress(null); }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0L5.205 6.735a.75.75 0 0 0 1.09 1.03L9.25 4.636v8.614Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Import CSV
          </button>
          {/* Export CSV */}
          <button
            onClick={async () => {
              setExporting(true);
              try { await exportToCsv({ search: debouncedSearch, department, country, status }); }
              catch { /* silent */ }
              finally { setExporting(false); }
            }}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <Link
            href="/employees/new"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add Employee
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"
          >
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or code…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
          />
        </div>
        <Select
          value={department}
          onChange={setDepartment}
          placeholder="All departments"
          options={[
            { value: '', label: 'All departments' },
            ...(filters?.departments.map((d) => ({ value: d.name, label: d.name })) ?? []),
          ]}
        />
        <Select
          value={country}
          onChange={setCountry}
          placeholder="All countries"
          options={[
            { value: '', label: 'All countries' },
            ...(filters?.countries.map((c) => ({ value: c.code, label: countryName(c.code) })) ?? []),
          ]}
        />
        <Select
          value={status}
          onChange={setStatus}
          placeholder="Any status"
          options={[
            { value: '', label: 'Any status' },
            ...(filters?.statuses.map((s) => ({
              value: s,
              label: s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
            })) ?? []),
          ]}
        />
        {(search || department || country || status) && (
          <button
            onClick={() => { setSearch(''); setDepartment(''); setCountry(''); setStatus(''); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Table */}
      <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</th>
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Code</th>
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Department</th>
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Country</th>
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Salary</th>
            </tr>
          </thead>
          <tbody>
            {result?.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                  No employees match the selected filters.
                </td>
              </tr>
            )}
            {result?.data.map((e) => (
              <tr
                key={e.id}
                onClick={() => router.push(`/employees/${e.id}`)}
                className="border-t border-slate-100 hover:bg-indigo-50/40 cursor-pointer transition-colors group"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: avatarColor(e.firstName) }}
                    >
                      {e.firstName.charAt(0).toUpperCase()}{e.lastName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-indigo-600 group-hover:text-indigo-800 transition-colors">
                        {e.firstName} {e.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{e.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                    {e.employeeCode}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-700">{e.jobTitle}</td>
                <td className="px-5 py-3 text-slate-600">{e.department}</td>
                <td className="px-5 py-3 text-slate-600">{countryName(e.country)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={e.status} />
                </td>
                <td className="px-5 py-3 text-right font-semibold text-slate-900">
                  {e.currentSalary ? formatMoney(e.currentSalary.amount, e.currentSalary.currency) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">
          {result && result.total > 0
            ? `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${result.total.toLocaleString()}`
            : ' '}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
              <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            Previous
          </button>
          <span className="px-2 text-slate-500">
            {result?.page ?? 1} / {result?.totalPages ?? 1}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!result || page >= result.totalPages}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Import CSV modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Import Employees from CSV</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload a CSV with employee data.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      const sample = [
                        'firstName,lastName,email,jobTitle,country,currency,departmentId,hireDate,salaryAmount,employmentType',
                        'Jane,Smith,jane.smith@acme.com,Senior Engineer,US,USD,1,2023-03-15,120000,FULL_TIME',
                        'Raj,Patel,raj.patel@acme.com,Product Manager,IN,INR,2,2022-07-01,2400000,FULL_TIME',
                        'Emma,Jones,emma.jones@acme.com,Designer,GB,GBP,3,2024-01-10,65000,FULL_TIME',
                      ].join('\n');
                      const blob = new Blob([sample], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'employees-sample.csv'; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                  >
                    Download sample CSV
                  </button>
                </p>
              </div>
              <button onClick={() => setImportOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* File picker */}
              {!importProgress && (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="text-slate-400" width="28" height="28">
                    <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0L5.205 6.735a.75.75 0 0 0 1.09 1.03L9.25 4.636v8.614Z" />
                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-600">Click to choose a CSV file</p>
                  <p className="text-xs text-slate-400">or drag and drop</p>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelect} />
                </div>
              )}

              {/* Preview */}
              {importRows.length > 0 && !importProgress && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{importRows.length} rows parsed</p>
                    <button onClick={() => { setImportRows([]); if (fileRef.current) fileRef.current.value = ''; }}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Change file</button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 text-xs">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-left">
                          {['First Name', 'Last Name', 'Email', 'Job Title', 'Dept ID', 'Country', 'Hire Date', 'Salary'].map((h) => (
                            <th key={h} className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-700">{r.firstName}</td>
                            <td className="px-3 py-2 text-slate-700">{r.lastName}</td>
                            <td className="px-3 py-2 text-slate-500 truncate max-w-[140px]">{r.email}</td>
                            <td className="px-3 py-2 text-slate-700">{r.jobTitle}</td>
                            <td className="px-3 py-2 text-slate-500">{r.departmentId}</td>
                            <td className="px-3 py-2 text-slate-500">{r.country}</td>
                            <td className="px-3 py-2 text-slate-500">{r.hireDate}</td>
                            <td className="px-3 py-2 text-slate-700">{r.salaryAmount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importRows.length > 5 && (
                      <p className="px-3 py-2 text-xs text-slate-400 border-t border-slate-100">…and {importRows.length - 5} more rows</p>
                    )}
                  </div>
                </>
              )}

              {/* Progress */}
              {importProgress && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {importing ? `Importing… ${importProgress.done} / ${importProgress.total}` : `Done — ${importProgress.done - importProgress.errors.length} imported, ${importProgress.errors.length} failed`}
                    </span>
                    <span className="text-slate-400">{Math.round((importProgress.done / importProgress.total) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${importing ? 'bg-indigo-500' : importProgress.errors.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                    />
                  </div>
                  {importProgress.errors.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                      {importProgress.errors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setImportOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                {importProgress && !importing ? 'Close' : 'Cancel'}
              </button>
              {importRows.length > 0 && !importProgress && (
                <button
                  onClick={runImport}
                  disabled={importing}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Import {importRows.length} employees
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
