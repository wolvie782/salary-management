'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, EmployeeDetail, Filters } from '../../../lib/api';
import { formatDate, formatMoney, avatarColor, countryName } from '../../../lib/format';
import { SalaryChangeForm } from './SalaryChangeForm';
import { StatusBadge } from '../../../components/StatusBadge';
import { Select } from '../../../components/Select';
import { LoadingNote } from '../../../components/Loader';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
];

export default function EmployeePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Status change state
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Edit profile state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', jobTitle: '', employmentType: '', departmentId: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!Number.isInteger(id)) { setError('Invalid employee id'); return; }
    api.employee(id).then((e) => {
      setEmployee(e);
      setEditForm({ firstName: e.firstName, lastName: e.lastName, email: e.email, jobTitle: e.jobTitle, employmentType: e.employmentType, departmentId: String(e.department.id) });
    }).catch(() => setError('Employee not found'));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.filters().then(setFilters); }, []);

  async function changeStatus(newStatus: string) {
    setStatusSaving(true);
    setStatusMsg(null);
    try {
      await api.updateEmployee(id, { status: newStatus });
      await load();
      setStatusMsg({ kind: 'ok', text: 'Status updated' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch {
      setStatusMsg({ kind: 'err', text: 'Failed to update status' });
    } finally {
      setStatusSaving(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    setEditError(null);
    try {
      await api.updateEmployee(id, { ...editForm, departmentId: Number(editForm.departmentId) });
      await load();
      setEditOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/employees" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          All employees
        </Link>
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </main>
    );
  }

  if (!employee) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <LoadingNote label="Loading employee…" />
        <div className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse mb-4" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 rounded-xl border border-slate-200 bg-white animate-pulse" />
          <div className="h-40 rounded-xl border border-slate-200 bg-white animate-pulse" />
        </div>
      </main>
    );
  }

  const current = employee.salaryHistory.find((s) => s.effectiveTo === null);
  const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
  const tenureMs = Date.now() - new Date(employee.hireDate).getTime();
  const tenureYears = Math.floor(tenureMs / (1000 * 60 * 60 * 24 * 365));
  const tenureMonths = Math.floor((tenureMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
      <Link href="/employees" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        All employees
      </Link>

      {/* Profile header */}
      <div className="mt-5 flex flex-col sm:flex-row items-start gap-4 sm:gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white shadow-sm ring-4 ring-white"
          style={{ backgroundColor: avatarColor(employee.firstName) }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {employee.jobTitle} · {employee.department.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={employee.status} />
              <div className="relative">
                <Select
                  value={employee.status}
                  onChange={changeStatus}
                  options={STATUS_OPTIONS}
                  className="w-36 text-xs"
                />
                {statusSaving && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60">
                    <svg className="animate-spin h-3.5 w-3.5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  </div>
                )}
              </div>
              {statusMsg && (
                <span className={`text-xs font-medium ${statusMsg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {statusMsg.text}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
              </svg>
              {employee.email}
            </span>
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.761 17 13.5 17 10a7 7 0 1 0-14 0c0 3.5 1.698 5.761 3.354 7.218.83.8 1.654 1.38 2.274 1.765.311.193.571.337.757.433a5.741 5.741 0 0 0 .281.14l.018.008.006.003ZM10 11.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" clipRule="evenodd" />
              </svg>
              {countryName(employee.country)}
            </span>
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
              </svg>
              Joined {formatDate(employee.hireDate)} ·{' '}
              {tenureYears > 0 ? `${tenureYears}y ` : ''}{tenureMonths}mo tenure
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
              {employee.employeeCode}
            </span>
          </div>
        </div>
      </div>

      {/* Role + Salary cards */}
      <section className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Role Details</h2>
            <button
              onClick={() => setEditOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
              </svg>
              {editOpen ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editOpen ? (
            <form onSubmit={saveEdit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 mb-1">First name</span>
                  <input required value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 mb-1">Last name</span>
                  <input required value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition" />
                </label>
              </div>
              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">Work email</span>
                <input required type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition" />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">Job title</span>
                <input required value={editForm.jobTitle} onChange={(e) => setEditForm((f) => ({ ...f, jobTitle: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 mb-1">Department</span>
                  <Select value={editForm.departmentId} onChange={(v) => setEditForm((f) => ({ ...f, departmentId: v }))}
                    options={filters?.departments.map((d) => ({ value: String(d.id), label: d.name })) ?? []} />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 mb-1">Employment type</span>
                  <Select value={editForm.employmentType} onChange={(v) => setEditForm((f) => ({ ...f, employmentType: v }))}
                    options={EMPLOYMENT_TYPE_OPTIONS} />
                </label>
              </div>
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={editSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {editSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" onClick={() => setEditOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <dl className="space-y-3 text-sm">
              <Row label="Job title" value={employee.jobTitle} />
              <Row label="Department" value={employee.department.name} />
              <Row label="Country" value={countryName(employee.country)} />
              <Row label="Employment type" value={employee.employmentType.replace(/_/g, ' ')} />
              <Row label="Hire date" value={formatDate(employee.hireDate)} />
            </dl>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Current Compensation</h2>
          {current ? (
            <>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">
                {formatMoney(current.amount, current.currency)}
              </div>
              <p className="mt-1.5 text-sm text-slate-500">per year · {current.currency}</p>
              <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Effective {formatDate(current.effectiveFrom)} · {current.reason.replace(/_/g, ' ').toLowerCase()}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">No active salary record.</p>
          )}
        </div>
      </section>

      {/* Salary change form */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Record a Salary Change</h2>
        <SalaryChangeForm employeeId={employee.id} currency={employee.currency} onSaved={load} />
      </section>

      {/* Salary history */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-700">Salary History</h2>
          <p className="text-xs text-slate-400 mt-0.5">{employee.salaryHistory.length} record{employee.salaryHistory.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Period</th>
                <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</th>
                <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Change</th>
              </tr>
            </thead>
            <tbody>
              {employee.salaryHistory.map((s, i) => {
                const previous = employee.salaryHistory[i + 1];
                const delta = previous ? (s.amount - previous.amount) / previous.amount : null;
                const isActive = s.effectiveTo === null;
                return (
                  <tr key={s.id} className={`border-t border-slate-100 ${isActive ? 'bg-indigo-50/40' : 'hover:bg-slate-50'} transition-colors`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                        <span className={isActive ? 'font-medium text-slate-900' : 'text-slate-600'}>
                          {formatDate(s.effectiveFrom)} → {formatDate(s.effectiveTo)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 capitalize text-slate-600">
                      {s.reason.replace(/_/g, ' ').toLowerCase()}
                      {s.note && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{s.note}</div>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(s.amount, s.currency)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {delta === null ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
                          delta >= 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta * 100).toFixed(1)}%
                        </span>
                      )}
                    </td>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900 text-right">{value}</dd>
    </div>
  );
}
