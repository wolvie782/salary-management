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
4. Sign in and access control. Salary data is sensitive: every API route and
   page except the login screen requires authentication. One HR Manager
   account, credentials from environment variables, bcrypt password hashing,
   JWT sessions.
5. Add and edit employees.
6. Compensation analytics. Headcount, total and average annual payroll,
   breakdowns by department and by country, salary distribution, top earners.
   Multi-country amounts are normalized to USD with a static FX table whose
   snapshot date is documented.
7. Seed script. Deterministic, realistic dataset of 10,000 employees across
   countries and departments, each with salary history.
8. Audit log. Every employee create, profile update, status change, and salary
   change is recorded with the action type, the changed data, and the email of
   the HR user who performed it. Viewable from the Audit Log page, filterable
   by action type.
9. CSV export. Download the full employee directory (all filters applied) as a
   CSV with no record cap. Backend endpoint `GET /employees/export` bypasses
   the paginated list's @Max(100) pageSize constraint.
10. CSV import. Upload a CSV, preview up to 5 rows, then import row by row with
    a live progress bar and error list. Column aliases accepted (firstName/
    first_name, hireDate/hire_date, etc.).
11. HR Assistant. Rule-based intent router that answers natural-language
    questions about payroll by routing to the analytics APIs. Labeled "Coming
    Soon" for the full LLM-powered version; the architecture is wired for a
    one-line swap.
12. Inline profile editing and status changes. HR can edit any profile field
    (name, email, job title, department, employment type) directly on the
    employee detail page without navigating away. Status can be changed
    instantly from a dropdown.

## Deliberately out of scope, and why

- Single sign on and role based access control beyond one role. The app has
  exactly one persona, so it ships with a real but minimal sign in: one HR
  account, email plus password, JWT session, every route protected. Company
  SSO, multiple roles (manager, finance, auditor) and permission levels are
  the deliberate exclusions: they add surface area without showing anything
  more about the salary domain. What is NOT excluded: input validation,
  parameterized queries, rate limiting, security headers, password hashing,
  and no secrets in the repo.
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
