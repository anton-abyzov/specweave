---
title: "Grill me and the glossary: settle every decision and every word before building"
sidebar_label: Grill me and glossary
description: "Two optional SpecWeave skills: sw-grill-me interviews you in rounds until every decision in a plan is settled, and sw-glossary writes GLOSSARY.md so one word means one thing in the business, the data, the code and the UI. specweave glossary check keeps the code in line."
---

# Grill me and the glossary

Most wrong builds start with a gap between what you meant and what the agent assumed. Two optional skills close it before any code is written:

- **sw-grill-me** interviews you in rounds until every decision in a plan is settled.
- **sw-glossary** writes `GLOSSARY.md`, the project's shared language, so an Order is an Order in the meeting, the database, the code and the UI.

Both arrived in SpecWeave 3.1.0 (17 October 2026). Neither is installed by default; the six core skills are increment, do, auto, done, review and handoff.

## Turn them on

```bash
specweave skills enable grill-me glossary
specweave skills list
```

`enable` writes `skills.enabled` in `.specweave/config.json` and installs the project copies. A project also gets them on its own when its files call for them: `planning.deepInterview: "deep"` installs grill-me, and a `GLOSSARY.md` or `GLOSSARY-MAP.md` at the root installs glossary. `specweave skills disable <name>` keeps a detected one out.

## Grill me

Say "grill me", "interview me" or "stress-test this plan" in any tool with the skill. The agent then:

1. **Reads first.** The code the plan touches, the config, the open increment and the glossary. It drafts the problem, scope and approach itself.
2. **Maps every open decision** and what each depends on, including the ones people forget: non-goals, failures and edge cases, security, rollout, and how a machine will check that it works.
3. **Looks up the facts.** Anything the code, docs or a quick command can answer, it answers. It never asks you what it could find.
4. **Asks in rounds.** Each round asks every decision whose prerequisites are settled, numbered, each with one clause on why it matters and a recommended answer you can accept with "yes".

   ```text
   Q1 Auth provider: who signs users in? Changes the data model and pricing.
      Recommended: Clerk, since the app already uses its React components.
   Q2 Rate limits: per API key or per IP? NAT users share IPs.
      Recommended: per API key.
   ```

   In tools with a structured question tool, such as Claude Code and Codex, the round arrives as a card; SpecWithCode shows it as a question card in the thread.
5. **Recomputes after every answer** and asks the next round, until nothing is open and you agree you share one picture. "Enough" or "your call" stops early, and every decision left takes the recommendation as a stated default.

The answers land in the increment's `spec.md` under `## Decisions`, split into Asked, Defaulted and Open, and are applied to Scope, the acceptance criteria and Approach. The do skill refuses to run unattended while `### Open` has entries.

Use grill-me at a project's start or before a change whose shape is unclear. A clear, small request does not need it; the [Decide step](/docs/guides/decide-step) in every new increment already asks the few decisions that matter.

## The glossary

Say "glossary" or "let's agree on the words". The agent interviews you term by term and writes `GLOSSARY.md` at the repository root:

```markdown
### Order
A customer's request to buy one or more products, placed at checkout and paid once.
- Avoid: purchase, basket, transaction
- Data: `orders` table; its lines in `order_lines`
- Code: `Order` in `src/orders/order.ts`; `POST /orders`
- UI: "Order", "My orders"
```

The definition says what the thing is in the client's words. `Avoid` lists the synonyms nobody should use. `Data`, `Code` and `UI` say where the term lives. A repository with several bounded contexts keeps a `GLOSSARY-MAP.md` at the root that links one glossary per context.

Once the file exists, grill-me uses it: when you use a word that conflicts with the glossary, the agent says so at once and asks which you mean.

## Keep the code in line

```bash
specweave glossary check            # the default action
specweave glossary check --strict   # exit 1 when anything is found, for CI
specweave glossary list             # print the terms and their avoided words
```

`check` reports two kinds of drift:

- an avoided word used as an identifier in the code, with `file:line`;
- a backticked name under `Data` or `Code` that no longer exists.

Rename the code or fix the glossary. Drift that needs real work becomes an increment. `--json` prints the findings for scripts. The cross-model [review](/docs/guides/cross-model-review) also hands the glossary terms to the reviewer.
