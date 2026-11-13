import type { Metadata } from 'next';
import { AuthGate } from '../components/AuthGate';
import './globals.css';

export const metadata: Metadata = {
  title: 'ACME People Pay',
  description: 'HR compensation management for 10,000+ employees across offices worldwide',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
