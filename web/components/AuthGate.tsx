'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getToken, redirectToLogin } from '../lib/auth';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === '/login') {
      setReady(true);
      return;
    }
    if (!getToken()) {
      redirectToLogin();
      return;
    }
    setReady(true);
  }, [pathname]);

  if (!ready) {
    return <main className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-500">Loading...</main>;
  }
  return <>{children}</>;
}
