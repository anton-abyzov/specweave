---
description: Build the shared language - interview the user term by term and write GLOSSARY.md with what each term means in the business, the data, the code and the UI. Use for "glossary", "ubiquitous language".
argument-hint: "[term...] [--check]"
version: 1.0.0
---

# sw-glossary: one word for one thing, everywhere

Domain-driven design's ubiquitous language: an Order should be an Order when the
client talks about it, in the database, in the code and on the screen. When the words
drift ("purchase" table, `Order` type, "basket" button), agents spend tokens decoding
jargon, name new code inconsistently and build the wrong thing. A short glossary fixes
that for every session after it. Run this at a project's start, when a new domain area
arrives, or whenever one word means two things or two words mean one.

## GLOSSARY.md

One file at the repository root. A repo with several bounded contexts keeps a
`GLOSSARY-MAP.md` at the root that links one `GLOSSARY.md` per context; follow it.
Create the file when the first term settles, never empty.

```markdown
# Glossary

A shop that sells refurbished laptops to small businesses.

## Ordering

### Order
A customer's request to buy one or more products, placed at checkout and paid once.
- Avoid: purchase, basket, transaction
- Data: `orders` table; its lines in `order_lines`
- Code: `Order` in `src/orders/order.ts`; `POST /orders`
- UI: "Order", "My orders"
- Rules: never deleted; cancelling sets the status to cancelled
```

- The definition says what the thing **is**, in the client's words, in one or two
  sentences. No implementation detail there.
- `Avoid` lists the synonyms nobody should use for it. Be opinionated: one term wins.
- `Data`, `Code` and `UI` say where the term lives at each level. Put table, column,
  type and file names in backticks so `specweave glossary check` can find them. Leave
  out a level the term does not have.
- `Rules` (optional) holds the invariants the business states about it.
- Only terms specific to this domain. Timeouts, caches and retries are not glossary
  terms even if the code uses them everywhere.
- Group terms under `##` headings when clusters appear; a flat list is fine.

## The interview

1. **Harvest.** Read the README, the schema or migrations, the models and types, the
   routes and the UI strings. List the nouns that recur, and every mismatch: one
   concept with several names (`purchases` table, `Order` type, "Basket" label) and
   one name with several meanings ("account" as login and as billing account).
2. **Ask in rounds**, as sw-grill-me does: a few terms per round, each question with
   your recommended answer, worded so "yes" accepts it. "The table is `purchases`, the
   type is `Order`, the button says Basket. Call all three an Order?" Use your tool's
   structured question tool when it has one.
3. **Sharpen with scenarios.** "A customer pays for 3 items and one ships late: one
   Order or two?" Invent the edge case that forces a boundary.
4. **Check the code.** When the user says how something works, read the code. If it
   disagrees ("the code cancels whole Orders; you said a single line can be
   cancelled"), say so and settle which one is right.
5. **Write each term as it settles**, not in a batch at the end.
6. **Drift is work, not an edit.** Where the code or data uses an avoided word, do not
   rename silently. List it for the user, and plan the renames as an increment
   (sw-increment): a table rename is a migration and the user's call.

## Using it

- Every skill writes specs, names, commits and replies in the glossary's terms.
- `specweave glossary check` lists avoided words used as identifiers in tracked files
  and backticked `Data` or `Code` names that no longer exist, with `file:line`.
  `--strict` exits 1 when it finds any, for CI. `--json` for tools.
- A new term or a changed meaning comes back here, or into sw-grill-me's interview.

## Configuration

`specweave skills enable glossary` installs this skill. A `GLOSSARY.md` or
`GLOSSARY-MAP.md` at the root installs it too, and adds a short "Shared language"
section to AGENTS.md on the next `specweave update`.

## Manual path (no CLI)

Write GLOSSARY.md by hand in the format above. Without the check, search the code for
each avoided word yourself (`git grep -n -i -w purchase`) and read the hits.

Adapted from mattpocock/skills `domain-modeling` (MIT, Copyright (c) 2026 Matt Pocock);
see `references/credits.md`.
