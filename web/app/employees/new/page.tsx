'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Filters } from '../../../lib/api';
import { countryName } from '../../../lib/format';
import { Select } from '../../../components/Select';

export default function NewEmployeePage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    employmentType: 'FULL_TIME',
    country: 'IN',
    currency: 'INR',
    departmentId: '',
    hireDate: '',
    salaryAmount: '',
  });

  useEffect(() => {
    api.filters().then(setFilters).catch((e) => setError(e.message));
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setCountry(code: string) {
    const match = filters?.countries.find((c) => c.code === code);
    setForm((f) => ({ ...f, country: code, currency: match?.currency ?? f.currency }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.createEmployee({
        ...form,
        departmentId: Number(form.departmentId),
        salaryAmount: Number(form.salaryAmount),
      });
      router.push(`/employees/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition';

  const labelClass = 'block text-sm font-medium text-slate-600 mb-1.5';

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
      <Link href="/employees" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        All employees
      </Link>

      <div className="mt-5">
        <h1 className="text-2xl font-bold text-slate-900">Add New Employee</h1>
        <p className="mt-1 text-sm text-slate-500">Fill in the details below to onboard a new team member.</p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-6">
        {/* Personal details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">Personal Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className={labelClass}>First name</span>
              <input
                required
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder="Jane"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Last name</span>
              <input
                required
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder="Smith"
                className={inputClass}
              />
            </label>
          </div>
          <label className="block">
            <span className={labelClass}>Work email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="jane.smith@acme.com"
              className={inputClass}
            />
          </label>
        </div>

        {/* Role details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">Role & Location</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Job title</span>
              <input
                required
                value={form.jobTitle}
                onChange={(e) => set('jobTitle', e.target.value)}
                placeholder="Senior Engineer"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Department</span>
              <Select
                value={form.departmentId}
                onChange={(v) => set('departmentId', v)}
                placeholder="Select department…"
                options={[
                  { value: '', label: 'Select department…' },
                  ...(filters?.departments.map((d) => ({ value: String(d.id), label: d.name })) ?? []),
                ]}
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Country</span>
              <Select
                value={form.country}
                onChange={setCountry}
                options={filters?.countries.map((c) => ({ value: c.code, label: countryName(c.code) })) ?? []}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Employment type</span>
              <Select
                value={form.employmentType}
                onChange={(v) => set('employmentType', v)}
                options={filters?.employmentTypes.map((t) => ({
                  value: t,
                  label: t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
                })) ?? []}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Hire date</span>
              <input
                required
                type="date"
                value={form.hireDate}
                onChange={(e) => set('hireDate', e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        </div>

        {/* Compensation */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">Starting Compensation</h2>
          <label className="block">
            <span className={labelClass}>Annual salary ({form.currency})</span>
            <input
              required
              type="number"
              min="1"
              step="any"
              value={form.salaryAmount}
              onChange={(e) => set('salaryAmount', e.target.value)}
              placeholder="e.g. 1200000"
              className={inputClass}
            />
            <span className="mt-1.5 block text-xs text-slate-400">
              Entered in the local currency of the selected country · {form.currency}
            </span>
          </label>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="shrink-0 mt-0.5 text-red-500" width="14" height="14">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating…' : 'Create Employee'}
          </button>
          <Link
            href="/employees"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
