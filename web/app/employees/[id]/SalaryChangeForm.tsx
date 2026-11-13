'use client';

import { useState } from 'react';
import { api } from '../../../lib/api';
import { Select } from '../../../components/Select';

const REASONS = ['PROMOTION', 'ANNUAL_REVIEW', 'MARKET_ADJUSTMENT', 'CORRECTION'];

const REASON_LABELS: Record<string, string> = {
  PROMOTION: 'Promotion',
  ANNUAL_REVIEW: 'Annual Review',
  MARKET_ADJUSTMENT: 'Market Adjustment',
  CORRECTION: 'Correction',
};

export function SalaryChangeForm({ employeeId, currency, onSaved }: {
  employeeId: number;
  currency: string;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
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
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-600">New Annual Salary ({currency})</span>
          <input
            required
            type="number"
            min="1"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1200000"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-600">Effective From</span>
          <input
            required
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-600">Reason</span>
          <Select
            value={reason}
            onChange={setReason}
            options={REASONS.map((r) => ({ value: r, label: REASON_LABELS[r] ?? r }))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-600">Note <span className="text-slate-400 font-normal">(optional)</span></span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="e.g. Promoted to senior level"
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Record Change'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
            Salary change recorded
          </span>
        )}
        {error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>
    </form>
  );
}
