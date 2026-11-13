'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getToken, redirectToLogin } from '../lib/auth';

// Redirects anonymous visitors to /login. The page shell renders regardless
// (no data in it); every API call still requires a valid token, so nothing
// sensitive is exposed before the redirect runs.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/login' && !getToken()) {
      redirectToLogin();
    }
  }, [pathname]);

  return <>{children}</>;
}
