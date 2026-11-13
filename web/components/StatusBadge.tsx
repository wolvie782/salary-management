export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ON_LEAVE: 'bg-amber-50 text-amber-700 border-amber-200',
    INACTIVE: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${styles[status] ?? styles.INACTIVE}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
