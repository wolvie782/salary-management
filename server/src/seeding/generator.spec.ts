import { COUNTRIES, DEPARTMENTS, generateDataset } from './generator';

describe('generateDataset', () => {
  it('is deterministic for the same seed', () => {
    const a = generateDataset(100, 7);
    const b = generateDataset(100, 7);
    expect(a).toEqual(b);
  });

  it('changes with a different seed', () => {
    const a = generateDataset(100, 7);
    const b = generateDataset(100, 8);
    expect(a.employees.map((e) => e.email)).not.toEqual(b.employees.map((e) => e.email));
  });

  it('produces the requested count with unique codes and emails', () => {
    const { employees } = generateDataset(500, 42);
    expect(employees).toHaveLength(500);
    expect(new Set(employees.map((e) => e.employeeCode)).size).toBe(500);
    expect(new Set(employees.map((e) => e.email)).size).toBe(500);
  });

  it('gives every employee exactly one open ended current salary', () => {
    const { employees } = generateDataset(500, 42);
    for (const e of employees) {
      const open = e.salaries.filter((s) => s.effectiveTo === null);
      expect(open).toHaveLength(1);
      for (let i = 1; i < e.salaries.length; i++) {
        expect(e.salaries[i].effectiveFrom.getTime()).toBeGreaterThan(
          e.salaries[i - 1].effectiveFrom.getTime(),
        );
        expect(e.salaries[i - 1].effectiveTo).not.toBeNull();
      }
      for (const s of e.salaries) {
        expect(s.amount).toBeGreaterThan(0);
        expect(s.currency).toBe(e.currency);
      }
    }
  });

  it('only uses known countries, currencies and departments', () => {
    const { employees } = generateDataset(500, 42);
    const countryCodes = new Set(COUNTRIES.map((c) => c.code));
    const currencies = new Set(COUNTRIES.map((c) => c.currency));
    const departments: Set<string> = new Set(DEPARTMENTS.map((d) => d.name));
    for (const e of employees) {
      expect(countryCodes.has(e.country as any)).toBe(true);
      expect(currencies.has(e.currency as any)).toBe(true);
      expect(departments.has(e.department)).toBe(true);
    }
  });
});
