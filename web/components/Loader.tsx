export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-indigo-600 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v8z" />
    </svg>
  );
}

// Visible loading state shown while data is being fetched: spinner plus a
// text label, so the screen never reads as blank during slow first loads.
export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm font-medium text-slate-500">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

// Compact variant for in-progress fetches above already-rendered content.
export function LoadingNote({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5 text-sm font-medium text-slate-500">
      <Spinner className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}
