import type { Metadata } from 'next';
import { Nav } from '../components/Nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'ACME Salary Management',
  description: 'Manage salary data for 10,000 employees across countries',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
