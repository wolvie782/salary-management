import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '../../../lib/api';
import { formatDate, formatMoney } from '../../../lib/format';
import { SalaryChangeForm } from './SalaryChangeForm';
import { StatusBadge } from '../../../components/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function EmployeePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  let employee;
  try {
    employee = await api.employee(id);
  } catch {
    notFound();
  }

  const current = employee.salaryHistory.find((s) => s.effectiveTo === null);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/employees" className="text-sm text-indigo-600 hover:underline">
        &larr; All employees
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {employee.employeeCode} &middot; {employee.email}
          </p>
        </div>
        <StatusBadge status={employee.status} />
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-medium">Role</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Job title" value={employee.jobTitle} />
            <Row label="Department" value={employee.department.name} />
            <Row label="Country" value={employee.country} />
            <Row label="Employment type" value={employee.employmentType.replace('_', ' ')} />
            <Row label="Hired" value={formatDate(employee.hireDate)} />
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-medium">Current salary</h2>
          {current ? (
            <>
              <div className="text-3xl font-semibold">
                {formatMoney(current.amount, current.currency)}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                per year, effective {formatDate(current.effectiveFrom)} &middot;{' '}
                {current.reason.replace(/_/g, ' ').toLowerCase()}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No active salary record.</p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-medium">Record a salary change</h2>
        <SalaryChangeForm employeeId={employee.id} currency={employee.currency} />
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-medium">Salary history</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2 font-medium">Period</th>
              <th className="py-2 font-medium">Reason</th>
              <th className="py-2 text-right font-medium">Amount</th>
              <th className="py-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {employee.salaryHistory.map((s, i) => {
              const previous = employee.salaryHistory[i + 1];
              const delta = previous ? (s.amount - previous.amount) / previous.amount : null;
              return (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-2">
                    {formatDate(s.effectiveFrom)} &rarr; {formatDate(s.effectiveTo)}
                  </td>
                  <td className="py-2">{s.reason.replace(/_/g, ' ').toLowerCase()}</td>
                  <td className="py-2 text-right">{formatMoney(s.amount, s.currency)}</td>
                  <td className="py-2 text-right">
                    {delta === null ? (
                      <span className="text-slate-400">-</span>
                    ) : (
                      <span className={delta >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {delta >= 0 ? '+' : ''}
                        {(delta * 100).toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
