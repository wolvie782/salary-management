# AI usage log

This project was built by Monu Mahto working with an agentic AI coding
assistant, as the assessment asks for. This file records how the assistant
was used and the instructions that drove the work.

## Division of labor

Direction, constraints and priorities came from Monu: the product must handle
scale and security well, the UI must be friendly, and every design choice
must be explainable in an interview. The assistant proposed the design
options, wrote the code and tests, and verified its own work by running the
app and checking the rendered pages. Each decision and its reasoning is
written down in docs/requirements.md and docs/tradeoffs.md so it can be
reviewed and defended on its merits.

Where the assistant's first version was wrong, the fix is part of the record:
a SQL join placed outside its FROM clause (caught by reading the query
before running it), chart bars invisible in rendered screenshots (caught by
looking at the pages, fixed by disabling animation), a "Product Manager
Manager" title bug in generated data (caught by inspecting the directory),
and a race where two simultaneous salary changes could both succeed (caught
by a dedicated concurrency test, fixed with a transactional conditional
close).

## Instructions the assistant worked under

1. Write a one-page requirements document first: goal, scope, features, and
   deliberate exclusions with reasoning. Nothing gets built before that.
2. Model salary as an append-only timeline; a change closes the open record
   and inserts a new one in one transaction. Never overwrite history.
3. Store money as Decimal, normalize analytics to USD with a static FX
   table, and document the snapshot date.
4. Seed 10,000 employees deterministically from a seeded PRNG so tests are
   reproducible: international names, country specific currencies, realistic
   level and department distribution.
5. Analytics must aggregate in SQL, not load tables into memory. Cap page
   sizes and rate limit the API.
6. Protect every route behind sign in; salary data is sensitive even in a
   demo.
7. Tests must be fast, deterministic and cover the salary change flow
   against a throwaway database, including the concurrent change case.
8. Verify the UI by actually rendering it and looking at screenshots, not
   by trusting that the build passed.

## Why this way

The brief cares about judgment, not typing speed. Using AI for volume work
while keeping product, data model and correctness decisions explicit is how
these tools earn their place: the assistant proposes, the engineer disposes,
and nothing ships that cannot be defended in a review.
