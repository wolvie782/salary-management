// Deterministic dataset generator for seeding and tests.
// No database access here: given the same seed it produces the same dataset,
// which keeps tests fast and reproducible.

export interface GeneratedSalary {
  amount: number; // annual gross in major currency units
  currency: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  reason: string;
}

export interface GeneratedEmployee {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  employmentType: string;
  status: string;
  country: string;
  currency: string;
  hireDate: Date;
  department: string;
  salaries: GeneratedSalary[];
}

export interface GeneratedDataset {
  departments: string[];
  fxRates: { currency: string; usdPerUnit: number; asOf: Date }[];
  employees: GeneratedEmployee[];
}

// mulberry32: tiny deterministic PRNG, good enough for synthetic data.
export function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const COUNTRIES = [
  { code: 'IN', currency: 'INR', weight: 0.35, base: 2_400_000, pool: 'indian' },
  { code: 'US', currency: 'USD', weight: 0.22, base: 120_000, pool: 'western' },
  { code: 'GB', currency: 'GBP', weight: 0.09, base: 70_000, pool: 'western' },
  { code: 'DE', currency: 'EUR', weight: 0.08, base: 75_000, pool: 'western' },
  { code: 'CA', currency: 'CAD', weight: 0.07, base: 105_000, pool: 'western' },
  { code: 'AU', currency: 'AUD', weight: 0.06, base: 115_000, pool: 'western' },
  { code: 'SG', currency: 'SGD', weight: 0.07, base: 90_000, pool: 'eastAsian' },
  { code: 'JP', currency: 'JPY', weight: 0.06, base: 9_000_000, pool: 'eastAsian' },
] as const;

// FX snapshot 2026-11-01, approximate, documented in docs/tradeoffs.md.
export const FX_SNAPSHOT_DATE = new Date('2026-11-01T00:00:00Z');
export const FX_RATES: Record<string, number> = {
  USD: 1,
  INR: 0.0119,
  GBP: 1.27,
  EUR: 1.06,
  CAD: 0.72,
  AUD: 0.66,
  SGD: 0.75,
  JPY: 0.0066,
};

export const DEPARTMENTS = [
  { name: 'Engineering', weight: 0.34, payFactor: 1.0, role: 'Software Engineer' },
  { name: 'Data', weight: 0.08, payFactor: 1.05, role: 'Data Analyst' },
  { name: 'Product', weight: 0.07, payFactor: 1.05, role: 'Product Manager' },
  { name: 'Design', weight: 0.05, payFactor: 0.9, role: 'Product Designer' },
  { name: 'Sales', weight: 0.14, payFactor: 0.85, role: 'Account Executive' },
  { name: 'Marketing', weight: 0.08, payFactor: 0.8, role: 'Marketing Specialist' },
  { name: 'Finance', weight: 0.08, payFactor: 0.95, role: 'Financial Analyst' },
  { name: 'People', weight: 0.06, payFactor: 0.8, role: 'People Partner' },
  { name: 'Operations', weight: 0.06, payFactor: 0.75, role: 'Operations Associate' },
  { name: 'Support', weight: 0.04, payFactor: 0.6, role: 'Support Specialist' },
] as const;

export const LEVELS = [
  { name: 'Intern', multiplier: 0.35, weight: 0.03, titlePrefix: '' },
  { name: 'Junior', multiplier: 0.6, weight: 0.17, titlePrefix: 'Junior ' },
  { name: 'Mid', multiplier: 1.0, weight: 0.35, titlePrefix: '' },
  { name: 'Senior', multiplier: 1.45, weight: 0.24, titlePrefix: 'Senior ' },
  { name: 'Staff', multiplier: 1.9, weight: 0.08, titlePrefix: 'Staff ' },
  { name: 'Manager', multiplier: 1.8, weight: 0.08, titlePrefix: '', titleSuffix: ' Manager' },
  { name: 'Director', multiplier: 2.6, weight: 0.035, titlePrefix: 'Director of ' },
  { name: 'VP', multiplier: 3.5, weight: 0.015, titlePrefix: 'VP of ' },
] as const;

const NAMES: Record<string, { first: string[]; last: string[] }> = {
  indian: {
    first: ['Aarav', 'Ananya', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Krishna', 'Meera', 'Nikhil', 'Priya', 'Rahul', 'Riya', 'Rohan', 'Sanya', 'Vikram', 'Aditi', 'Dev', 'Farhan', 'Gauri', 'Harsh'],
    last: ['Sharma', 'Patel', 'Iyer', 'Reddy', 'Khan', 'Gupta', 'Nair', 'Singh', 'Mehta', 'Das', 'Kulkarni', 'Joshi', 'Chopra', 'Verma', 'Rao', 'Menon'],
  },
  western: {
    first: ['James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Lucas', 'Mia', 'Henry', 'Amelia', 'Jack', 'Charlotte', 'Owen', 'Harper', 'Lukas', 'Jonas'],
    last: ['Smith', 'Johnson', 'Brown', 'Taylor', 'Miller', 'Wilson', 'Moore', 'Anderson', 'Thomas', 'White', 'Harris', 'Clark', 'Lewis', 'Walker', 'Mueller', 'Schmidt'],
  },
  eastAsian: {
    first: ['Wei', 'Mei', 'Hiro', 'Yuki', 'Kenji', 'Sakura', 'Jun', 'Li', 'Xin', 'Hana', 'Ryo', 'Aiko', 'Ming', 'Fang', 'Sora', 'Ren'],
    last: ['Tan', 'Lim', 'Tanaka', 'Sato', 'Suzuki', 'Takahashi', 'Wong', 'Chen', 'Ng', 'Watanabe', 'Yamamoto', 'Lee', 'Kobayashi', 'Ito', 'Nakamura', 'Kato'],
  },
};

function pickWeighted<T extends { weight: number }>(rng: () => number, items: readonly T[]): T {
  let r = rng();
  for (const item of items) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return items[items.length - 1];
}

function roundAmount(amount: number, currency: string): number {
  // Whole units for most currencies, thousands for JPY where units are small.
  if (currency === 'JPY') return Math.round(amount / 1000) * 1000;
  return Math.round(amount);
}

const REVIEW_REASONS = ['ANNUAL_REVIEW', 'MARKET_ADJUSTMENT'] as const;

export function generateDataset(employeeCount = 10_000, seed = 42): GeneratedDataset {
  const rng = createRng(seed);
  const departments = DEPARTMENTS.map((d) => d.name);
  const fxRates = Object.entries(FX_RATES).map(([currency, usdPerUnit]) => ({
    currency,
    usdPerUnit,
    asOf: FX_SNAPSHOT_DATE,
  }));

  const now = new Date('2026-11-13T00:00:00Z'); // fixed reference date keeps output stable
  const employees: GeneratedEmployee[] = [];

  for (let i = 0; i < employeeCount; i++) {
    const country = pickWeighted(rng, COUNTRIES);
    const department = pickWeighted(rng, DEPARTMENTS);
    let level = pickWeighted(rng, LEVELS);
    const pool = NAMES[country.pool];
    const firstName = pool.first[Math.floor(rng() * pool.first.length)];
    const lastName = pool.last[Math.floor(rng() * pool.last.length)];
    const seq = i + 1;

    const yearsAgo = rng() * 12;
    const hireDate = new Date(now.getTime() - yearsAgo * 365.25 * 24 * 3600 * 1000);

    const jitter = 0.9 + rng() * 0.25;
    let salary = country.base * level.multiplier * department.payFactor * jitter;

    const salaries: GeneratedSalary[] = [];
    let cursor = new Date(hireDate);
    salaries.push({
      amount: roundAmount(salary, country.currency),
      currency: country.currency,
      effectiveFrom: new Date(cursor),
      effectiveTo: null,
      reason: 'HIRE',
    });

    // Walk forward year by year: possible raise, occasional promotion.
    const historyDepth = Math.min(Math.floor(yearsAgo), 6);
    for (let y = 0; y < historyDepth; y++) {
      const roll = rng();
      if (roll < 0.6) {
        salary *= 1.03 + rng() * 0.09;
        cursor = new Date(cursor.getTime() + 365.25 * 24 * 3600 * 1000);
        salaries[salaries.length - 1].effectiveTo = new Date(cursor);
        salaries.push({
          amount: roundAmount(salary, country.currency),
          currency: country.currency,
          effectiveFrom: new Date(cursor),
          effectiveTo: null,
          reason: REVIEW_REASONS[Math.floor(rng() * REVIEW_REASONS.length)],
        });
      } else if (roll < 0.68 && level.name !== 'VP') {
        const idx = LEVELS.findIndex((l) => l.name === level.name);
        level = LEVELS[Math.min(idx + 1, LEVELS.length - 1)];
        salary *= 1.12 + rng() * 0.13;
        cursor = new Date(cursor.getTime() + 365.25 * 24 * 3600 * 1000);
        salaries[salaries.length - 1].effectiveTo = new Date(cursor);
        salaries.push({
          amount: roundAmount(salary, country.currency),
          currency: country.currency,
          effectiveFrom: new Date(cursor),
          effectiveTo: null,
          reason: 'PROMOTION',
        });
      }
    }

    const statusRoll = rng();
    const status = statusRoll < 0.93 ? 'ACTIVE' : statusRoll < 0.97 ? 'ON_LEAVE' : 'INACTIVE';
    const typeRoll = rng();
    const employmentType = typeRoll < 0.9 ? 'FULL_TIME' : typeRoll < 0.94 ? 'PART_TIME' : 'CONTRACT';

    const titlePrefix = 'titlePrefix' in level ? level.titlePrefix : '';
    const titleSuffix = 'titleSuffix' in level ? level.titleSuffix : '';
    const jobTitle =
      level.name === 'Manager'
        ? `${department.role} Manager`
        : level.name === 'Director' || level.name === 'VP'
          ? `${titlePrefix}${department.name}`
          : `${titlePrefix}${department.role}${titleSuffix}`;

    employees.push({
      employeeCode: `ACME-${String(seq).padStart(6, '0')}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${seq}@acme.example`,
      jobTitle,
      employmentType,
      status,
      country: country.code,
      currency: country.currency,
      hireDate,
      department: department.name,
      salaries,
    });
  }

  return { departments, fxRates, employees };
}
