'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '../lib/auth';

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function logout() {
    clearToken();
    router.push('/login');
  }

  function navLinkClass(href: string) {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
    return `flex items-center h-16 border-b-2 text-sm font-medium transition-colors ${
      active
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
    }`;
  }

  function mobileLinkClass(href: string) {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
    return `flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      active ? 'text-indigo-600 bg-indigo-50' : 'text-slate-700 hover:bg-slate-50'
    }`;
  }

  const signOutSvg = (
    <>
      <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clipRule="evenodd" />
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setMobileOpen(false)}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
            <svg className="h-4.5 w-4.5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">ACME</span>
            <span className="ml-1 text-sm font-semibold text-indigo-600">People Pay</span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-8">
          <Link href="/" className={navLinkClass('/')}>Dashboard</Link>
          <Link href="/employees" className={navLinkClass('/employees')}>Employees</Link>
          <Link href="/assistant" className={`${navLinkClass('/assistant')} relative`}>
            Assistant
            <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 leading-none">Beta</span>
          </Link>
          <Link href="/audit" className={navLinkClass('/audit')}>Audit Log</Link>
        </nav>

        {/* Desktop sign out */}
        <button
          onClick={logout}
          title="Sign out"
          className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
            {signOutSvg}
          </svg>
          Sign out
        </button>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="lg:hidden flex items-center justify-center h-10 w-10 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          <Link href="/" className={mobileLinkClass('/')} onClick={() => setMobileOpen(false)}>
            Dashboard
          </Link>
          <Link href="/employees" className={mobileLinkClass('/employees')} onClick={() => setMobileOpen(false)}>
            Employees
          </Link>
          <Link href="/assistant" className={mobileLinkClass('/assistant')} onClick={() => setMobileOpen(false)}>
            <span>Assistant</span>
            <span className="ml-auto inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Beta</span>
          </Link>
          <Link href="/audit" className={mobileLinkClass('/audit')} onClick={() => setMobileOpen(false)}>
            Audit Log
          </Link>
          <div className="pt-2 mt-1 border-t border-slate-100">
            <button
              onClick={() => { setMobileOpen(false); logout(); }}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                {signOutSvg}
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
