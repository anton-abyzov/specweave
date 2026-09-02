---
description: Expand the solution space before committing - framed options compared on stated criteria, ending in a pick. Use when saying "brainstorm", "ideate", or "what are our options".
version: 2.0.0
argument-hint: "<topic> [--depth quick|standard|deep]"
---

# Brainstorm

Diverge, then converge, then hand the winner to `sw:increment`. This never replaces
the spec — it decides *which* thing to spec.

## Depth

| Depth | Options | Output |
|---|---|---|
| `quick` (default for a narrow question) | 3 | a table + a pick, in the conversation |
| `standard` | 4–5 | table + trade-offs + `reports/brainstorm.md` if an increment exists |
| `deep` | 5–7, incl. one "do nothing" and one contrarian | written doc + rejected alternatives + risks |

## Steps

1. **Frame.** One sentence: the decision to be made, and what would make an answer good.
   Write down 3–5 **criteria** up front (cost, time-to-ship, blast radius, reversibility,
   who maintains it). Choosing criteria after seeing the options is how bias sneaks in.
2. **Diverge.** Generate the options *before* judging any of them. Force variety:
   - the obvious one (do the thing directly);
   - the cheap one (what buys 80% for 20%);
   - the buy-instead-of-build one;
   - the do-nothing / defer one, with what it costs;
   - one that inverts an assumption everyone is making.
   Name each option in 3–6 words.
3. **Converge.** One table: option × criteria, with a one-line "kills it if" per option.
   Then a short paragraph per surviving option: how it works, what it costs, what breaks.
4. **Pick.** State the recommendation, the runner-up, and the one fact that would flip
   the decision. If the honest answer is "we need data first", say that and name the
   experiment.
5. **Hand off.** `sw:increment "<the picked option>"`. Paste the rejected alternatives into
   the new spec's **Approach** section — that is where they earn their keep.

## Rules

- Never grade an option while still generating options.
- Every option gets the same amount of scrutiny; do not build a straw man to justify the favourite.
- Tables and short paragraphs, not essays.
- Persist the doc only when there is an increment to hold it
  (`.specweave/increments/<id>/reports/brainstorm.md`); otherwise keep it in the conversation.
- If the user already knows what they want, skip to `sw:increment` and say why.

## Multi-perspective variant

For a genuinely contested decision, run three lenses over the same option set — advocate
(strongest case for), critic (how each fails in production), pragmatist (what ships this
week) — and merge. In Claude Code these can be parallel subagents (`sw:team` in brainstorm
mode); in other tools, do the three passes in sequence and label them.

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#brainstorm)
