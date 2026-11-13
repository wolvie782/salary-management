import Link from 'next/link';

export function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4">
        <Link href="/" className="whitespace-nowrap text-lg font-semibold text-slate-900">
          ACME <span className="text-indigo-600">People Pay</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600 sm:gap-6">
          <Link href="/" className="hover:text-slate-900">Dashboard</Link>
          <Link href="/employees" className="hover:text-slate-900">Employees</Link>
          <Link
            href="/employees/new"
            className="whitespace-nowrap rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
          >
            Add employee
          </Link>
        </nav>
      </div>
    </header>
  );
}
