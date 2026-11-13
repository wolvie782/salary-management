// Money helpers. Amounts are Decimal-safe numbers here because callers pass
// Prisma Decimal values converted with Number(); analytics round to whole
// currency units before display, so float noise never reaches a user.

export type FxTable = Record<string, number>; // USD per 1 unit of currency

export function toUsd(amount: number, currency: string, fx: FxTable): number {
  const rate = fx[currency];
  if (rate === undefined) {
    throw new Error(`No FX rate for currency ${currency}`);
  }
  return amount * rate;
}

export function median(sorted: number[]): number | null {
  const n = sorted.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface Bucket {
  label: string;
  min: number;
  max: number | null; // null means open ended
  count: number;
}

export function bucketize(values: number[], width: number, cap: number): Bucket[] {
  const buckets: Bucket[] = [];
  for (let min = 0; min < cap; min += width) {
    buckets.push({
      label: `${formatK(min)}-${formatK(min + width)}`,
      min,
      max: min + width,
      count: 0,
    });
  }
  buckets.push({ label: `${formatK(cap)}+`, min: cap, max: null, count: 0 });

  for (const v of values) {
    const idx = v >= cap ? buckets.length - 1 : Math.max(0, Math.floor(v / width));
    buckets[idx].count += 1;
  }
  return buckets;
}

function formatK(v: number): string {
  return v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`;
}
