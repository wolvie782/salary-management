export function formatMoney(amount: number, currency: string, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount);
}

export function formatUsdCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
  return `$${amount}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'Present';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  IN: 'India',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  SG: 'Singapore',
  AE: 'United Arab Emirates',
  BR: 'Brazil',
  MX: 'Mexico',
  NL: 'Netherlands',
  SE: 'Sweden',
  NZ: 'New Zealand',
  ES: 'Spain',
  IT: 'Italy',
  CH: 'Switzerland',
  PL: 'Poland',
  ZA: 'South Africa',
  NG: 'Nigeria',
  KE: 'Kenya',
  PH: 'Philippines',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  HK: 'Hong Kong',
  KR: 'South Korea',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  LK: 'Sri Lanka',
};

export function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

/**
 * All avatars stay within the indigo/blue family so the employee list
 * looks cohesive rather than a rainbow. Five close shades give just
 * enough variation to distinguish people without clashing.
 */
const AVATAR_PALETTE = [
  '#1e40af', // blue-800
  '#1d4ed8', // blue-700
  '#2563eb', // blue-600
  '#4f46e5', // indigo-600
  '#4338ca', // indigo-700
];

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
