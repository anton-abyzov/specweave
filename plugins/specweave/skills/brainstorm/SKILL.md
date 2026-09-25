---
description: Widen the options before committing - framed options compared on stated criteria, ending in a pick that becomes an increment. Use for "brainstorm", "ideate", "what are our options".
argument-hint: "<topic> [--depth quick|standard|deep]"
version: 3.0.0
---
<!-- Generated from skills/sw-brainstorm/SKILL.md by scripts/build/generate-skills.mjs. Edit the source, then npm run build. -->

# sw-brainstorm: diverge, converge, pick

Decides which thing to spec; it never replaces the spec. Hand the winner to sw-increment.

## Depth

| Depth | Options | Output |
|---|---|---|
| `quick` (default for a narrow question) | 3 | a table and a pick, in the conversation |
| `standard` | 4 to 5 | table, trade-offs, `reports/brainstorm.md` if an increment exists |
| `deep` | 5 to 7, including "do nothing" and one contrarian | written doc, rejected alternatives, risks |

## Steps

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
5. **Hand off.** `specweave create-increment "<the pick>"` (sw-increment) and paste the
   rejected alternatives into its Approach section.

## Contested decisions

Run three lenses over the same options: advocate (strongest case for), critic (how each
fails in production), pragmatist (what ships this week). If your tool supports
subagents, run them in parallel; otherwise do three labelled passes in sequence. Merge.

## Rules

- Never grade an option while still generating options; give each the same scrutiny.
- Tables and short paragraphs, not essays.
- If the user already knows what they want, skip to sw-increment and say why.

## Manual path (no CLI)

Nothing here needs the CLI; create the increment folder by hand as sw-increment describes.
