---
description: Widen options, then settle the user's critical decisions one question at a time, each with a recommended answer, before the spec. Use for "brainstorm", "what are our options", "grill me".
argument-hint: "<topic> [--depth quick|standard|deep] [--decide off|critical|deep]"
version: 3.1.0
---

# sw-brainstorm: options, then decisions

Two parts, used alone or in order. **Options** picks which thing to build. **Decide**
settles the calls only the user can make. sw-increment runs Decide as its own step.
Neither replaces the spec.

## Options

| Depth | Options | Output |
|---|---|---|
| `quick` (default for a narrow question) | 3 | a table and a pick, in the conversation |
| `standard` | 4 to 5 | table, trade-offs, `reports/brainstorm.md` if an increment exists |
| `deep` | 5 to 7, including "do nothing" and one contrarian | written doc, rejected alternatives, risks |

1. **Frame.** One sentence: the decision and what makes an answer good. Write 3 to 5
   criteria first (cost, time to ship, blast radius, reversibility, who maintains it).
   Choosing criteria after seeing the options is how bias gets in.
2. **Diverge.** Generate before judging, and force variety: the obvious one, the cheap
   one (80% for 20%), buy instead of build, do nothing or defer (with its cost), and one
   that inverts an assumption everyone makes. Name each in 3 to 6 words.
3. **Converge.** One table, option by criteria, with a "kills it if" per option. Then a
   short paragraph per survivor: how it works, what it costs, what breaks.
4. **Pick.** The recommendation, the runner-up, and the one fact that would flip it. If
   the honest answer is "we need data", name the experiment.

Contested decisions: run three lenses over the same options, advocate (strongest case),
critic (how each fails in production), pragmatist (what ships this week). In parallel if
your tool supports subagents, otherwise three labelled passes. Merge.

## Decide

Mode comes from `--decide`, else `planning.deepInterview` in `.specweave/config.json`:
`off` skips, `critical` (also when unset) asks at most 5, `deep` has no cap. "Grill me",
"interview me" or "think hard" means `deep` for this run; "just build it" means `off`.

1. **Think first.** Read the code the change touches, project config and any draft.
   Draft Problem, Scope and Approach yourself, then list every open decision across:
   scope and non-goals; users and flows; data model; integrations, installs, accounts
   and keys; failures and edge cases; security and privacy; performance and scale;
   rollout and migration; how we will know it works.
2. **Triage.** *Fact*: look it up (code, docs, a subagent if your tool has them), never
   ask. *My call*: reversible or low impact, so pick a default. *Theirs*: hard to
   reverse, costly, or taste. Only "theirs" reaches the user.
3. **Ask, one question at a time.** Rank "theirs" by impact times uncertainty and ask
   the top one, wait, then the next: an answer often settles or changes the rest.
   `critical` stops after 5; a clear request asks nothing and says so. Each question
   gets one clause on why it matters and 2 to 4 options, the first your recommendation
   marked "(Recommended)" with its trade-off, plus a free answer. "Yes" accepts the
   recommendation; "your call" accepts it for every question left.
4. **Deep ("grill me").** Walk the decision tree: after each answer, ask what it
   unlocks, until no "theirs" remains and the user agrees you share one picture. No cap,
   still one question at a time with a recommendation. "Enough" stops it; whatever is
   left gets a default. Optional extra for longer grilling sessions:
   `npx vskill@latest install mattpocock/skills/grilling`.
5. **Record** in spec.md under `## Decisions`, then apply each answer to Scope, ACs and
   Approach, replacing any text it contradicts. Before spec.md exists, hold them and
   write them when sw-increment creates it.

```markdown
## Decisions
### Asked
- D-01 Auth provider? → Clerk (user). Changes the data model and pricing.
### Defaulted (change any before sw-do)
- D-04 Rate-limit store → in-memory, Redis later (reversible).
### Open
- none
```

**Question cards.** If your tool has a structured question tool (Claude Code's
ask-user-question tool, Codex `request_user_input`), ask through it so apps such as
SpecWithCode show a card: header `D-01 Auth`, the recommended option first, custom
answers allowed, multi-select only for "which of these services or installs". Without
one, write `D-01 <question>` with numbered options and `Recommended: <option>`. Never
ask for a secret in a question; use the app's secret request or name the env var.

Rules: facts are your job, decisions are the user's. A default the user never saw is
one they could not reject, so list every default. When the user has no shape for the
idea yet, ask them to describe it before offering options; options steer.

## Hand off

`specweave create-increment "<the pick>"` (sw-increment), paste the rejected
alternatives into Approach and the decisions into `## Decisions`. If the user already
knows what they want, skip Options and say why. sw-auto will not start while
`### Open` has entries.

## Manual path (no CLI)

Nothing here needs the CLI: read `.specweave/config.json` by hand and create the
increment folder as sw-increment describes.

Decide adapts ideas from obra/superpowers `brainstorming`, mattpocock/skills
`grilling` and GitHub Spec Kit `/clarify` (all MIT); see `references/credits.md`.
