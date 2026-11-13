'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Filters } from '../../../lib/api';

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

  const input =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none';

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/employees" className="text-sm text-indigo-600 hover:underline">
        &larr; All employees
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Add employee</h1>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">First name</span>
            <input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={input} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Last name</span>
            <input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={input} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Work email</span>
          <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={input} />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Job title</span>
            <input required value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} className={input} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Department</span>
            <select required value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)} className={input}>
              <option value="">Choose...</option>
              {filters?.departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Country</span>
            <select value={form.country} onChange={(e) => setCountry(e.target.value)} className={input}>
              {filters?.countries.map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Employment type</span>
            <select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)} className={input}>
              {filters?.employmentTypes.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Hire date</span>
            <input required type="date" value={form.hireDate} onChange={(e) => set('hireDate', e.target.value)} className={input} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Annual salary ({form.currency})</span>
          <input
            required
            type="number"
            min="1"
            step="any"
            value={form.salaryAmount}
            onChange={(e) => set('salaryAmount', e.target.value)}
            className={input}
          />
          <span className="mt-1 block text-xs text-slate-400">
            Salary is paid in the local currency of the selected country.
          </span>
        </label>

        {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create employee'}
        </button>
      </form>
    </main>
  );
}
