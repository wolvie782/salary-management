'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { formatUsdCompact, countryName } from '../lib/format';

/**
 * Department chart: sequential indigo palette — darkest bar = highest payroll,
 * fading to lighter shades. Professional, single-hue, executive-grade.
 */
const DEPT_PALETTE = [
  '#312e81', // indigo-900
  '#3730a3', // indigo-800
  '#4338ca', // indigo-700
  '#4f46e5', // indigo-600
  '#6366f1', // indigo-500
  '#818cf8', // indigo-400
  '#a5b4fc', // indigo-300
  '#c7d2fe', // indigo-200
  '#bfdbfe', // blue-200
  '#bae6fd', // sky-200
];

/** Country palette: sky-500 — visually distinct from indigo (dept chart). */
const COUNTRY_COLOR = '#0ea5e9';

/** Distribution: violet — distinct from the two charts above. */
const DIST_COLOR = '#7c3aed';

function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: TooltipProps<number, string> & { formatter?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-2.5 shadow-xl text-sm">
      <p className="font-semibold text-slate-700 mb-0.5">{label}</p>
      <p className="text-indigo-600 font-bold text-base">
        {formatter ? formatter(val) : val.toLocaleString()}
      </p>
    </div>
  );
}

const AXIS_STYLE = { fill: '#94a3b8', fontSize: 11 };

export function DepartmentChart({
  data,
}: {
  data: { department: string; totalUsd: number; headcount: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: 8, right: 8, bottom: 48 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="department"
          angle={-35}
          textAnchor="end"
          interval={0}
          tick={AXIS_STYLE}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatUsdCompact}
          tick={AXIS_STYLE}
          width={58}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip formatter={formatUsdCompact} />}
          cursor={{ fill: '#f8fafc', radius: 4 }}
        />
        <Bar dataKey="totalUsd" radius={[6, 6, 0, 0]} isAnimationActive={false} maxBarSize={52}>
          {data.map((_, i) => (
            <Cell key={i} fill={DEPT_PALETTE[i % DEPT_PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CountryChart({
  data,
}: {
  data: { country: string; averageUsd: number; headcount: number }[];
}) {
  const labeled = data.map((d) => ({ ...d, label: countryName(d.country) }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={labeled} margin={{ left: 8, right: 8, bottom: 48 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          angle={-35}
          textAnchor="end"
          interval={0}
          tick={AXIS_STYLE}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatUsdCompact}
          tick={AXIS_STYLE}
          width={58}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip formatter={formatUsdCompact} />}
          cursor={{ fill: '#f8fafc', radius: 4 }}
        />
        <Bar
          dataKey="averageUsd"
          fill={COUNTRY_COLOR}
          radius={[6, 6, 0, 0]}
          isAnimationActive={false}
          maxBarSize={52}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Extract the lower-bound from a label like "$30k-$40k" → "$30k", "$250k+" → "$250k+"
function shortDistLabel(label: string): string {
  if (label.includes('+')) return label; // keep "$250k+" as-is
  const match = label.match(/^(\$[\d.]+k?)/i);
  return match ? match[1] : label;
}

export function DistributionChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ left: 8, right: 8, bottom: 56 }} barCategoryGap="10%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tickFormatter={shortDistLabel}
          angle={-55}
          textAnchor="end"
          interval={1}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          dy={4}
        />
        <YAxis
          tick={AXIS_STYLE}
          width={48}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip formatter={(v) => `${v.toLocaleString()} employees`} />}
          cursor={{ fill: '#f8fafc', radius: 4 }}
        />
        {/* Color by relative height: peak bracket gets darkest indigo, tails are lighter */}
        <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => {
            const ratio = d.count / maxCount;
            // indigo-100 (#e0e7ff) → indigo-600 (#4f46e5)
            const r = Math.round(224 + (79 - 224) * ratio);
            const g = Math.round(231 + (70 - 231) * ratio);
            const b = Math.round(255 + (229 - 255) * ratio);
            return <Cell key={i} fill={`rgb(${r},${g},${b})`} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
