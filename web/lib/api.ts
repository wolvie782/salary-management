const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

import { clearToken, getToken, redirectToLogin, setToken } from './auth';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(res: Response) {
  if (res.status === 401) {
    clearToken();
    redirectToLogin();
  }
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  department?: string;
  country?: string;
  status?: string;
  employmentType?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface EmployeeListItem {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  employmentType: string;
  status: string;
  country: string;
  currency: string;
  hireDate: string;
  department: string;
  currentSalary: { amount: number; currency: string; effectiveFrom: string } | null;
}

export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SalaryHistoryItem {
  id: number;
  amount: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  reason: string;
  note: string | null;
}

export interface EmployeeDetail {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  employmentType: string;
  status: string;
  country: string;
  currency: string;
  hireDate: string;
  department: { id: number; name: string };
  salaryHistory: SalaryHistoryItem[];
}

export interface Overview {
  headcount: number;
  activeCount: number;
  paidHeadcount: number;
  totalAnnualPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number | null;
  fxSnapshot: string | null;
}

export interface Filters {
  departments: { id: number; name: string }[];
  countries: { code: string; currency: string }[];
  statuses: string[];
  employmentTypes: string[];
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

async function send<T>(path: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message;
    } catch {
      // keep raw text
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error('Invalid email or password');
  }
  const data = (await res.json()) as { accessToken: string; user: { name: string; email: string } };
  setToken(data.accessToken);
  return data.user;
}

export const api = {
  listEmployees: (params: ListParams) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return get<Paged<EmployeeListItem>>(`/employees?${qs.toString()}`);
  },
  employee: (id: number) => get<EmployeeDetail>(`/employees/${id}`),
  createEmployee: (body: unknown) => send<EmployeeDetail>('/employees', 'POST', body),
  updateEmployee: (id: number, body: unknown) => send<EmployeeDetail>(`/employees/${id}`, 'PATCH', body),
  addSalaryChange: (id: number, body: unknown) =>
    send<EmployeeDetail>(`/employees/${id}/salary-changes`, 'POST', body),
  overview: () => get<Overview>('/analytics/overview'),
  byDepartment: () => get<{ department: string; headcount: number; totalUsd: number; averageUsd: number }[]>('/analytics/by-department'),
  byCountry: () => get<{ country: string; currency: string; headcount: number; averageLocal: number; averageUsd: number }[]>('/analytics/by-country'),
  distribution: () => get<{ widthUsd: number; capUsd: number; buckets: { label: string; min: number; max: number | null; count: number }[] }>('/analytics/distribution'),
  topEarners: (limit = 10) => get<{ id: number; name: string; jobTitle: string; country: string; amount: number; currency: string; usd: number }[]>(`/analytics/top-earners?limit=${limit}`),
  filters: () => get<Filters>('/meta/filters'),
};
