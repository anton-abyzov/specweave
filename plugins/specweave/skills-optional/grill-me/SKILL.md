---
description: Interview the user relentlessly, in rounds, until every decision in a plan is settled; facts are your job, decisions are theirs. Use for "grill me", "interview me", "stress-test this plan".
argument-hint: "[topic or increment-id]"
version: 1.0.0
---
<!-- Generated from skills/sw-grill-me/SKILL.md by scripts/build/generate-skills.mjs. Edit the source, then npm run build. -->

# sw-grill-me: settle every decision before building

No one knows exactly what they want. The gap between the user and the agent is where
wrong builds come from, and a model never closes it alone: it fills the gaps with
guesses. This skill walks the plan's decision tree with the user until nothing is left
silently assumed. Use it at a project's start, before a change whose shape is unclear,
or whenever the user asks to be grilled. A clear, small request does not need it.

## How it runs

1. **Read first.** The code the plan touches, `.specweave/config.json`, the open
   increment's spec.md (`specweave task list`) and `GLOSSARY.md` if it exists. Draft
   the problem, the scope and the approach yourself.
2. **Map the tree.** List every open decision and what it depends on. Probe the
   things users forget: scope and non-goals; users and flows; the data and the words
   for it; integrations, installs, accounts and keys; failures and edge cases;
   security and privacy; performance and scale; rollout and migration; how a machine
   will check that it works.
3. **Facts are yours.** Anything the code, docs, config or a quick command can answer,
   look up (in a subagent if your tool has them). Never ask the user what you could
   find. A lookup still running blocks only the questions that depend on it.
4. **Ask in rounds.** Each round asks the whole frontier: every decision whose
   prerequisites are already settled. Number the questions; give each one clause on
   why it matters and your recommended answer, worded so "yes" accepts it. A question
   that depends on another one in the same round waits for the next round.
5. **Recompute** after every answer: settled decisions unlock new ones, and some
   answers make others moot. Then ask the next round.
6. **Stop** when the frontier is empty and the user confirms you share one picture.
   "Enough" or "your call" stops early: every decision left gets your recommendation
   as a stated default.

Plain text, one round per message:

```text
Q1 Auth provider: who signs users in? Changes the data model and pricing.
   Recommended: Clerk, since the app already uses its React components.
Q2 Rate limits: per API key or per IP? NAT users share IPs.
   Recommended: per API key.
```

If your tool has a structured question tool (as Claude Code and Codex do), ask the
round through it so apps such as SpecWithCode show a card: up to 4 questions per card,
header `Q1 Auth`, your recommendation first, free answers allowed, multi-select only
for "which of these services or installs". Split a larger frontier over several cards.
Never ask for a secret in a question: name the env var or use the app's secret request.

## The words (when GLOSSARY.md exists)

- When the user uses a term that conflicts with the glossary, say so at once: "The
  glossary says an Order is one checkout; you mean one shipment. Which is it?"
- When a word is fuzzy ("account" for both the login and the billing account), propose
  one precise term each.
- Test a boundary with a concrete scenario: "A customer pays for 3 items and one ships
  late: one Order or two?"
- When the user states how something works, check the code agrees and surface any
  contradiction.
- Write each settled term into `GLOSSARY.md` as sw-glossary describes, when it settles.

## Record

In the increment's spec.md, under `## Decisions` (before spec.md exists, hold them
until sw-increment creates it with `specweave create-increment`):

```markdown
## Decisions
### Asked
- D-01 Auth provider? → Clerk (user). Changes the data model and pricing.
### Defaulted (change any before sw-do)
- D-04 Rate-limit store → in-memory, Redis later (reversible).
### Open
- none
```

Apply every answer to Scope, the acceptance criteria and Approach, replacing any text
it contradicts. Keep a Decision line only when a later change could contradict it:
hard to reverse, surprising without context, or a real trade-off. Everything else is
just applied. Do not build until the user confirms; sw-do refuses to run unattended
while `### Open` has entries.

## Configuration

`specweave skills enable grill-me` installs this skill; `planning.deepInterview: deep`
in `.specweave/config.json` installs it too and makes sw-increment run it for every
new increment. `critical` (the default) keeps sw-increment to at most 5 questions.

## Manual path (no CLI)

Nothing here needs the CLI: read the files by hand, ask in rounds, and write the
decisions into spec.md yourself.

Adapted from mattpocock/skills `grilling` and `domain-modeling` (MIT, Copyright (c) 2026
Matt Pocock); see `references/credits.md`.
