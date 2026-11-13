'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getToken, redirectToLogin } from '../lib/auth';
import { Nav } from './Nav';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  useEffect(() => {
    if (!isLogin && !getToken()) {
      redirectToLogin();
    }
  }, [isLogin]);

  return (
    <>
      {!isLogin && <Nav />}
      {children}
    </>
  );
}
