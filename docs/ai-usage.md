# AI usage log

This project was built with an agentic AI pair programmer, as the assessment
asks for. This file records how it was used and the instructions that drove
the work. I reviewed every decision and can walk through any part of the
codebase.

## How AI was used

- Scaffolding the monorepo, NestJS modules, and Next.js pages from the plan
  below.
- Drafting the Prisma schema, seed generator, DTOs, and tests from explicit
  design decisions I set.
- Iterating on UI layout and fixing build/type errors as they surfaced.
- Verifying its own work: running the server, hitting endpoints, and
  screenshotting pages to confirm what shipped.

## What I decided versus what AI drafted

Mine: the product scope (what is in and out, and why), the append-only salary
timeline, the static FX snapshot, the decimal money handling, the country and
department model, the test strategy, and every acceptance check before a
commit landed.

AI drafted: boilerplate, component structure, chart wiring, and test bodies,
each against those decisions. Where its first version broke (a SQL join in
the wrong place, an animation that hid chart bars in static screenshots), I
had it fix and re-verify before moving on.

## Representative prompts and instructions

1. "Write a one-page requirements document first: goal, scope, features, and
   deliberate exclusions with reasoning. Nothing gets built before that."
2. "Model salary as an append-only timeline; a change closes the open record
   and inserts a new one in one transaction. Never overwrite history."
3. "Store money as Decimal, normalize analytics to USD with a static FX
   table, and document the snapshot date."
4. "Seed 10,000 employees deterministically from a seeded PRNG so tests are
   reproducible; international names, country-specific currencies, realistic
   level and department distribution."
5. "Analytics must aggregate in SQL; no loading whole tables into memory.
   Cap page sizes and rate-limit the API."
6. "Tests must be fast, deterministic and cover the salary-change flow end
   to end against a throwaway database."
7. "Verify the UI by actually rendering it and looking at screenshots, not
   by trusting that the build passed."

## Why this approach

The brief cares about judgment, not typing speed. Using AI for volume work
while keeping product, data model and correctness decisions human is how I
use these tools at work: AI proposes, I dispose, and nothing ships that I
could not defend in a review.
