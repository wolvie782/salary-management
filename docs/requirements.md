# Salary Management at ACME - Requirements

## Goal

Replace the HR team's Excel-based salary tracking with web software that lets an
HR manager manage salary data for 10,000 employees across multiple countries and
answer questions about how the organization pays people.

## Users

One persona: the HR Manager of ACME (internal operations user, desktop first).

## Scope and features

1. Employee directory. Paginated, searchable by name, email or employee code,
   filterable by department, country and employment status, sortable by the
   main columns. Has to stay fast at 10,000+ rows.
2. Employee profile. Personal and role details plus the full salary history
   for that person.
3. Salary changes. Record a compensation change (amount, currency, effective
   date, reason). History is preserved; old records are closed, never
   overwritten or deleted.
4. Add and edit employees.
5. Compensation analytics. Headcount, total and average annual payroll,
   breakdowns by department and by country, salary distribution, top earners.
   Multi-country amounts are normalized to USD with a static FX table whose
   snapshot date is documented.
6. Seed script. Deterministic, realistic dataset of 10,000 employees across
   countries and departments, each with salary history.

## Deliberately out of scope, and why

- Authentication and authorization. This is a single-role internal tool that
  in a real deployment sits behind company SSO and the office network. Login
  screens would add surface area without showing anything about the salary
  domain. The security work that does matter here (input validation,
  parameterized queries, rate limiting, security headers, no secrets in the
  repo) is in scope.
- Payroll execution: payslips, bank transfers, tax withholding. That is a
  payments and compliance domain with its own rules per country. This tool is
  about managing and understanding salary data, not moving money.
- Live FX rates. Real rates change daily and require an external data source.
  A static rate table with a documented snapshot date keeps analytics
  reproducible and testable; swapping in a live feed later is a one-function
  change.
- Multi-tenancy, org hierarchies, approval workflows. Real HRIS concerns, but
  not needed to answer "how does the org pay people" for one organization.
- Native mobile. Responsive web covers the HR desktop workflow.

## Success criteria

- HR can find any employee and their salary history in seconds across 10k
  records.
- HR can record a salary change without losing history.
- HR can answer "what do we pay, where, and how is it distributed" from the
  dashboard.
- Core logic covered by fast, deterministic unit tests. Incremental commits
  that show how the solution evolved. Deployed app plus a short demo video.
