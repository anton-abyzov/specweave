---
slug: when-a-spec-pays-off
title: "When does a spec pay off? We looked at 1,476 of our own pull requests"
authors: [antonabyzov]
tags: [spec-driven, ai-development, best-practices, claude-code]
description: "Four weeks of our own work with Claude Code and Codex: under 300 changed lines, increment-backed and direct work looked about the same; above 1,000, threads that shipped exactly one pull request took about twice the messages with an increment. What we changed in SpecWeave because of it."
keywords: [spec-driven development, does spec-driven development slow you down, AI coding agents, Claude Code, Codex, when to write a spec]
---

# When does a spec pay off?

SpecWeave asks agents to plan work as an increment: a `spec.md` with acceptance criteria and tasks. We build SpecWeave, SpecWithCode and Verified Skill with it, so we asked a plain question of our own last four weeks: does planning make the work longer, bigger or more complicated?

<!-- truncate -->

## The data

From 6 October to 3 November 2026: 1,476 merged pull requests across five repositories, 1,142 SpecWithCode threads and 1,445 Claude Code sessions. About a third of the pull requests (515, 35%) were tied to an increment. The rest were done directly. This is one team's history, not a controlled experiment.

## Small changes: about the same

Under 300 changed lines, increment-backed and direct pull requests stayed open about as long (median 0.2 to 0.6 hours) and needed follow-up fixes about as often. Threads that shipped one such pull request used similar active time and output tokens, though they exchanged more messages.

## Large changes: about twice the messages

Above 1,000 changed lines, increment-backed pull requests stayed open 1.7 to 2.6 times longer. Threads that shipped exactly one took about twice the messages and output tokens. Follow-up fixes were as common or less common (24% against 24%, and 28% against 37% for the largest). Harder work may be what gets planned, so this is an association, not a measured cost.

## Task status came late

A typical increment was one 52-line spec with five tasks. But in 16 of 20 sampled increments, at least one task was marked done only after the pull request had merged.

## What we changed

We did not measure what continuity is worth. It is still why we plan: Codex picks up where Claude Code stopped, a second account continues, another machine runs the next task. So SpecWeave's instructions now say:

- Skip the increment for one pull request under about 300 changed lines, a follow-up fix, a UI tweak or an investigation: `specweave small-fix "<why>"`.
- Plan multi-day work, cross-platform changes, auth, payments, migrations and work another tool or machine will pick up. These win over size.
- Record tasks as you finish them, not after the merge.

The tables, the method and the caveats are in [When to plan an increment](/docs/guides/when-to-plan-an-increment).
