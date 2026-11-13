'use client';

import { useState } from 'react';
import { api } from '../../../lib/api';

const REASONS = ['PROMOTION', 'ANNUAL_REVIEW', 'MARKET_ADJUSTMENT', 'CORRECTION'];

export function SalaryChangeForm({ employeeId, currency, onSaved }: { employeeId: number; currency: string; onSaved: () => void }) {
  const [amount, setAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.addSalaryChange(employeeId, {
        amount: Number(amount),
        effectiveFrom,
        reason,
        note: note || undefined,
      });
      setAmount('');
      setEffectiveFrom('');
      setNote('');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
      <label className="text-sm">
        <span className="mb-1 block text-slate-500">New annual salary ({currency})</span>
        <input
          required
          type="number"
          min="1"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-slate-500">Effective from</span>
        <input
          required
          type="date"
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-slate-500">Reason</span>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, ' ').toLowerCase()}</option>
          ))}
        </select>
      </label>
      <label className="text-sm md:col-span-1">
        <span className="mb-1 block text-slate-500">Note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save change'}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600 md:col-span-5">{error}</p>
      )}
    </form>
  );
}
