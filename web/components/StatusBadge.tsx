export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { badge: string; dot: string; label: string }> = {
    ACTIVE: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Active',
    },
    ON_LEAVE: {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      label: 'On Leave',
    },
    INACTIVE: {
      badge: 'bg-slate-100 text-slate-500 border-slate-200',
      dot: 'bg-slate-400',
      label: 'Inactive',
    },
  };
  const s = styles[status] ?? styles.INACTIVE;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
