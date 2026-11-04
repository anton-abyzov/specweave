---
title: "When to plan an increment, measured on 1,476 pull requests"
sidebar_label: When to plan an increment
description: "Four weeks of our own work: 1,476 merged pull requests, 1,142 SpecWithCode threads and 1,445 Claude Code sessions. Under 300 changed lines, increment-backed and direct work looked about the same; above 1,000, threads that shipped exactly one pull request took about twice the messages with an increment. The rule SpecWeave follows now."
keywords: [spec-driven development, when to write a spec, AI coding agents, Claude Code, Codex, increment, small fix, measured]
---

# When to plan an increment

**Skip the increment for one pull request under about 300 changed lines, a follow-up fix, a UI tweak or an investigation. Plan one for multi-day work, cross-platform changes, auth, payments, migrations, and anything another tool or machine will pick up. A reason to plan wins over a small size.**

That rule comes from looking at our own work. We build SpecWeave, SpecWithCode and Verified Skill with SpecWeave, so we compared four weeks of work tied to an increment (a `spec.md` with acceptance criteria and tasks) with work done directly. This is an observational look at one team's history, not a controlled experiment.

## What we measured

From 6 October to 3 November 2026, across the five repositories behind these products:

| Source | Count |
| --- | --- |
| Merged pull requests by the maintainer, releases excluded | 1,476 |
| SpecWithCode threads that ran work | 1,142 |
| Claude Code sessions (desktop app and SpecWithCode) | 1,445 |
| Increments opened | 310 |

A pull request counts as increment-backed when an increment links it, its title or branch carries the increment number, or the session that opened it created an increment, edited its `spec.md` or recorded its tasks. That last signal can include tasks recorded after the work (see below). Changed lines leave out `.specweave/` files, lockfiles and generated code.

## How much work was increment-backed

About a third. 515 of 1,476 merged pull requests (35%) were tied to an increment, 356 of them by a direct link in the increment, title or branch. So were 18% of SpecWithCode threads and 11% of Claude desktop sessions.

## By size

Medians, matched by changed lines:

| Changed lines | Pull requests (increment / direct) | Hours open | CI failed at least once | Failed commits per commit | Follow-up fix within 3 days |
| --- | --- | --- | --- | --- | --- |
| 0 to 50 | 95 / 206 | 0.2 / 0.3 | 6% / 9% | 3% / 7% | 0% / 5% |
| 50 to 300 | 103 / 289 | 0.6 / 0.6 | 20% / 12% | 9% / 8% | 10% / 10% |
| 300 to 1,000 | 129 / 243 | 1.4 / 0.9 | 22% / 21% | 11% / 9% | 10% / 14% |
| 1,000 to 3,000 | 119 / 161 | 2.5 / 1.5 | 40% / 25% | 10% / 9% | 24% / 24% |
| over 3,000 | 69 / 62 | 2.7 / 1.0 | 46% / 24% | 8% / 3% | 28% / 37% |

Under 300 lines the two groups look about the same, with one exception: between 50 and 300 lines, 20% of increment-backed pull requests failed CI at least once against 12% of direct ones. Above 1,000 lines, increment-backed pull requests stayed open 1.7 to 2.6 times longer and had more commits. Measured per commit, the failure rate was closer: 10% against 9% between 1,000 and 3,000 lines, and 8% against 3% above 3,000. Hours open run from opening the pull request to merging it, so pull requests opened early include writing time.

## Turns and tokens

Among threads that shipped a pull request (medians):

| Where | Increment-backed | Direct |
| --- | --- | --- |
| SpecWithCode on Claude: user messages / output tokens | 16 / 197k | 9 / 105k |
| SpecWithCode on Codex: user messages / output tokens | 33 / 294k | 14 / 86k |
| Claude desktop: turns / output tokens | 15 / 307k | 9 / 170k |

That is 1.7 to 2.3 times the messages and 1.8 to 3.4 times the output tokens, depending on the tool. Differences in work size may explain part of the gap. Among threads that shipped exactly one pull request, those under 300 lines spent similar median active time (0.81 against 0.83 hours) and similar output tokens (73k against 71k), though with more messages (12.5 against 7.5). Those over 1,000 lines took 14 against 8 messages and 222k against 109k output tokens. These single-PR groups are small: 11 to 26 threads each. Harder work may be what gets an increment, so the gap is an association, not a measured cost.

## What the spec takes to write

A typical increment is a 52-line `spec.md` with 5 tasks and 5 acceptance criteria. With its other files (a median of 8, 4 of them reports) it comes to about 10 KB, and in a sample of 20 the first pull request followed the increment by a median of about 40 minutes. We did not time the writing itself.

Task status was often recorded late. In 16 of those 20, at least one task was marked done after the pull request had merged, and 55 of 271 increments had every task recorded within ten minutes. Status recorded that way says little about how the work went.

## What we could not measure

Quality: follow-up fixes within three days were as common or less common for increment-backed work (24% against 24%, 28% against 37% for the largest), and there was one revert in four weeks, on a direct pull request, too few to compare. Differences in what kind of work gets planned may explain part of every gap on this page.

The benefit of continuity: an increment is what Codex, a second account or another machine reads to continue a task Claude Code started. We did not measure how much time that saves. It is the reason we still recommend an increment for work that outlives one session.

## The rule

The SpecWeave instructions every agent reads (`AGENTS.md`, the sw-increment skill and the planning reminder) now say:

- **Skip:** one pull request under about 300 changed lines, a follow-up fix to a merged pull request, a UI tweak, an investigation. Run `specweave small-fix "<why>"` and ship.
- **Plan:** multi-day work, cross-platform changes, auth, payments, data migrations, and anything another tool or machine will pick up. These win over size. Work bigger than one pull request gets one increment per pull request.
- **Record tasks as you finish them,** with `specweave task done T-NN --run "<test>"`, not after the merge.

## Caveats

- One maintainer and solo repositories: no review requested changes, so review outcomes cannot show a quality difference.
- Codex CLI sessions outside SpecWithCode, other machines and direct pushes to the main branch are not counted.
- An increment that never names its pull requests leaves them labelled direct, so some direct work is mislabelled. We did not measure how much.
- Claude and Codex count cached input differently, so token figures are compared within one tool.

Related: [What is an increment](/docs/guides/core-concepts/what-is-an-increment), [Handoff and pickup](/docs/guides/cross-tool-handoff).
