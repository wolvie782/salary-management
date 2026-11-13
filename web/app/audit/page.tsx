'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, AuditLogEntry } from '../../lib/api';
import { Select } from '../../components/Select';

const ACTION_META: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  EMPLOYEE_CREATED: {
    label: 'Employee Created',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
        <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2.046 15.253c-.058.468.172.92.57 1.175A9.953 9.953 0 0 0 8 18c1.982 0 3.83-.578 5.384-1.573a1.2 1.2 0 0 0 .569-1.174 6.978 6.978 0 0 0-13.907 0ZM14.5 9.5a.5.5 0 0 1 .5.5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 .5-.5Z" />
      </svg>
    ),
  },
  PROFILE_UPDATED: {
    label: 'Profile Updated',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
        <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
      </svg>
    ),
  },
  STATUS_CHANGED: {
    label: 'Status Changed',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
      </svg>
    ),
  },
  SALARY_CHANGED: {
    label: 'Salary Changed',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
        <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.18.943.195.025.38.064.554.11.33.082.63.218.882.432.504.418.78.98.78 1.59 0 .61-.277 1.172-.78 1.591-.252.213-.551.35-.882.431-.173.045-.358.084-.554.11v.5a.75.75 0 0 1-1.5 0v-.5A3.25 3.25 0 0 1 5 11.25a.75.75 0 0 1 1.5 0c0 .827.627 1.5 1.5 1.5.207 0 .4-.02.572-.056V9.564a3.13 3.13 0 0 0-1.138-.432C6.628 8.973 6 8.411 6 7.75c0-.66.628-1.223 1.434-1.382.173-.045.358-.084.554-.11V5.75a.75.75 0 0 1 1.5 0v.508c.657.065 1.233.3 1.675.65a.75.75 0 1 1-.943 1.166 1.75 1.75 0 0 0-.89-.454ZM8.33 8.62ZM8 5a3 3 0 1 0 0 6A3 3 0 0 0 8 5Z" />
        <path fillRule="evenodd" d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8Z" clipRule="evenodd" />
      </svg>
    ),
  },
};

function formatAction(entry: AuditLogEntry) {
  const meta = ACTION_META[entry.action] ?? { label: entry.action.replace(/_/g, ' '), color: 'bg-slate-100 text-slate-600 border-slate-200', icon: null };
  return meta;
}

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name', lastName: 'Last name', email: 'Email',
  jobTitle: 'Job title', employmentType: 'Employment type',
  status: 'Status', departmentId: 'Department',
};

function humanValue(key: string, val: unknown): string {
  const s = String(val);
  if (key === 'status') return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  if (key === 'employmentType') return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  if (key === 'reason') return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return s;
}

function formatDetails(entry: AuditLogEntry): string {
  const d = entry.details as Record<string, unknown>;
  if (entry.action === 'SALARY_CHANGED') {
    const parts: string[] = [];
    if (d.amount) parts.push(`Amount: ${Number(d.amount).toLocaleString()}`);
    if (d.reason) parts.push(`Reason: ${humanValue('reason', d.reason)}`);
    if (d.effectiveFrom) parts.push(`Effective: ${new Date(String(d.effectiveFrom)).toLocaleDateString()}`);
    return parts.join(' · ');
  }
  if (entry.action === 'EMPLOYEE_CREATED') {
    return `${d.firstName} ${d.lastName} · ${d.email} · ${d.jobTitle}`;
  }
  if (entry.action === 'PROFILE_UPDATED') {
    const keys = Object.keys(d).filter((k) => k !== 'departmentId' && d[k] !== undefined && d[k] !== null);
    return keys.map((k) => `${FIELD_LABELS[k] ?? k}: ${humanValue(k, d[k])}`).join(' · ');
  }
  return JSON.stringify(d).slice(0, 120);
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.auditLog(200)
      .then(setLogs)
      .catch(() => setError('Failed to load audit log'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? logs.filter((l) => l.action === filter)
    : logs;

  const actionTypes = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="mt-1 text-sm text-slate-500">
            All changes to employee records and salary data · most recent first
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filter}
            onChange={setFilter}
            placeholder="All actions"
            className="w-48"
            options={[
              { value: '', label: 'All actions' },
              ...actionTypes.map((a) => ({ value: a, label: ACTION_META[a]?.label ?? a.replace(/_/g, ' ') })),
            ]}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="text-slate-400" width="20" height="20">
              <path fillRule="evenodd" d="M5 4a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Zm-1 9v-1h5.5a.5.5 0 0 0 0-1H4V8h5.5a.5.5 0 0 0 0-1H4V6h5.5a.5.5 0 0 0 0-1H4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">No audit events yet</p>
          <p className="mt-1 text-xs text-slate-400">Events are recorded when employees are created or updated.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Stats bar */}
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-6 text-xs text-slate-500">
            <span><strong className="text-slate-900">{filtered.length}</strong> events</span>
            {actionTypes.map((a) => {
              const count = logs.filter((l) => l.action === a).length;
              const meta = ACTION_META[a];
              return (
                <button key={a} onClick={() => setFilter(filter === a ? '' : a)}
                  className={`flex items-center gap-1 hover:text-slate-700 transition-colors ${filter === a ? 'text-indigo-600 font-medium' : ''}`}>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${meta?.color ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {meta?.icon}
                    {meta?.label ?? a}
                  </span>
                  <span className="text-slate-400">×{count}</span>
                </button>
              );
            })}
          </div>

          {/* Log entries */}
          <div className="divide-y divide-slate-100">
            {filtered.map((entry) => {
              const meta = formatAction(entry);
              return (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  {/* Timeline dot */}
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm text-slate-500">
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        Employee #{entry.entityId}
                      </span>
                      <button
                        onClick={() => router.push(`/employees/${entry.entityId}`)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        View employee →
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDetails(entry)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                      <span>by</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
                          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                        </svg>
                        {entry.performedBy}
                      </span>
                      <span>·</span>
                      <span>{timeAgo(entry.createdAt)}</span>
                      <span className="hidden sm:inline text-slate-300">{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
