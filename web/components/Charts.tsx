'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatUsdCompact } from '../lib/format';

export function DepartmentChart({
  data,
}: {
  data: { department: string; totalUsd: number; headcount: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 8, right: 8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="department" angle={-35} textAnchor="end" interval={0} fontSize={12} />
        <YAxis tickFormatter={(v: number) => formatUsdCompact(v)} fontSize={12} width={56} />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === 'totalUsd' ? [formatUsdCompact(value), 'Annual payroll'] : [value, name]
          }
        />
        <Bar dataKey="totalUsd" fill="#4f46e5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CountryChart({
  data,
}: {
  data: { country: string; averageUsd: number; headcount: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 8, right: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="country" fontSize={12} />
        <YAxis tickFormatter={(v: number) => formatUsdCompact(v)} fontSize={12} width={56} />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === 'averageUsd' ? [formatUsdCompact(value), 'Average salary (USD)'] : [value, name]
          }
        />
        <Bar dataKey="averageUsd" fill="#0d9488" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DistributionChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 8, right: 8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" angle={-45} textAnchor="end" interval={0} fontSize={11} />
        <YAxis fontSize={12} width={48} />
        <Tooltip formatter={(value: number) => [value, 'Employees']} />
        <Bar dataKey="count" fill="#d97706" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
