---
title: Jev (System One)
description: Delegate closed-set decisions — routing, shell-command safety, text screening, failure triage, headless browsing — to TypeSafe's Jev instead of a frontier-model turn.
sidebar_label: Jev (System One)
---

# Jev (System One)

Agents running SpecWeave burn frontier-model turns on decisions whose answers were
never open-ended: which skill a prompt needs, which model tier a task deserves, whether
a shell command is safe to run unattended, whether a red test run is a regression or a
flake, whether pulled issue text carries instructions aimed at the agent.

[Jev](https://docs.typesafe.ai) is TypeSafe's System One model. It answers exactly that
shape of question in roughly 250 ms for roughly $0.00002, with calibrated probabilities
and a schema it cannot violate. It is a **selection** model: it never generates code,
prose or explanations.

## The one test

> Can every possible answer be written down before the call?

Yes, Jev. No, keep the work in the frontier model. That is the whole rule.

Three primitives, nothing else:

| Primitive | Answer shape | Use for |
|---|---|---|
| `choice` | one of 2 to 255 named options, plus probabilities and a confidence | which skill, which tier, which scope, which failure kind |
| `noul` | probability that a statement is true, from 0 to 1 | yes/no gates: needs an increment, AC satisfied, injected text |
| `score` | position on 2 to 10 ordered, described levels | graded severity, risk, priority |

## Setup

Jev is **off by default**. It is a paid external call, so nothing happens until you opt in.

```bash
specweave jev setup     # live ping, then writes jev.enabled into .specweave/config.json
specweave jev doctor    # provider, model, key source, live latency
```

The key lives in the environment, never in a config file or a log:

| Provider | Endpoint | Model | Variable |
|---|---|---|---|
| `openrouter` (default) | `https://openrouter.ai/api/v1/systemone` | `jev-1.13` | `OPENROUTER_API_KEY` |
| `typesafe` | `https://api.typesafe.ai/v1/systemone` | `jev-latest` | `TYPESAFE_API_KEY` |

`JEV_API_KEY` is honoured for either. Every SpecWeave surface reports the variable
**name** only and never its value. `SPECWEAVE_JEV=0` disables Jev for one process;
`SPECWEAVE_JEV=1` enables it ad hoc.

### What leaves the machine

Every `specweave jev` call sends the question state to the configured provider
(OpenRouter or TypeSafe) under your own key: the prompt text, task titles and acceptance
criteria, the shell command, test-output tails, screened text, and page text and element
names while browsing. Secret-shaped values — tokens, `--password` and `--token` flags,
`KEY=value` assignments, bearer headers and URL credentials — are masked heuristically
before the request and the number of masked values is reported, but the masking is
best-effort and never a guarantee. Treat Jev like any other third-party API: if you would
not paste the state into one, do not send it.

### Configuration

```json
{
  "jev": {
    "enabled": true,
    "provider": "openrouter",
    "model": "jev-1.13",
    "apiKeyEnv": "OPENROUTER_API_KEY",
    "timeoutMs": 4000,
    "thresholds": { "route": 0.7, "guardDeny": 0.85, "guardWarn": 0.5 },
    "guards": { "bash": false },
    "modelRouting": true,
    "browse": { "allowDomains": [], "maxSteps": 20 }
  }
}
```

Every field, its default and the `SPECWEAVE_JEV` / `SPECWEAVE_JEV_PROVIDER` /
`SPECWEAVE_JEV_MODEL` overrides are in the
[configuration reference](/docs/reference/configuration#jev). Thresholds are clamped to
0–1 on load, and `guardDeny` is never allowed below `guardWarn`.

With `jev.enabled` true, `specweave update-instructions` renders a Jev section into
`CLAUDE.md` and `AGENTS.md` so every agent in the project knows when to delegate.

## Commands

| Command | Prints | Exit codes |
|---|---|---|
| `specweave jev doctor` | provider, model, key source, live latency | 0 ok, 4 unavailable |
| `specweave jev setup` | live ping, then enables Jev in the project config | 0 ok, 4 unavailable |
| `specweave jev ask` | raw typed answers as JSON for your own state and questions | 0 ok, 1 bad input, 4 unavailable |
| `specweave jev route "<prompt>"` | skill, request kind, complexity to model tier, needs-increment, each with confidence | 0 ok, 4 unavailable |
| `specweave jev task T-01 [inc]` | complexity to model tier for one task in the ledger | 0 ok, 4 unavailable |
| `specweave jev guard "<command>"` | scope and destructiveness verdict with probabilities | 0 allow, 2 warn, 3 deny, 4 unavailable |
| `specweave jev screen [file]` | injection probability and whether the text is flagged | 0 ok, 4 unavailable |
| `specweave jev failure [file]` | failure kind with probabilities | 0 ok, 4 unavailable |
| `specweave jev browse` | steps, final url and title, page text excerpt, screenshot paths | 0 ok, 4 unavailable |
| `specweave jev usage` | calls, tokens and cost from the usage ledger | 0 |

`ask` takes `--state` and `--questions` as inline JSON, plain text, `@file` or `-` for
stdin. For a one-off question use the shorthand `--choice "..." --option key=description`
(repeatable) or `--noul "..."`. `screen` and `failure` read stdin when no file is given,
and `--json` on any action prints the machine-readable form.

**Exit 4 is not a failure.** It means Jev is disabled, unconfigured or unreachable, and
the agent should continue with its own judgement.

## What SpecWeave uses it for

- **Model tier routing.** With `jev.modelRouting`, `selectModelTierForTask()` asks Jev how
  much reasoning a task needs (trivial to haiku, moderate to sonnet, complex to opus) and
  falls back to the keyword heuristic when Jev is unavailable or unsure. The live surface
  for the same judgement is `specweave jev task T-NN`. SpecWeave does **not** silently
  re-route model tiers inside task generation: the tier is a suggestion you act on.
- **Completion evaluation.** The binary "did this command output show a clean run?" check
  becomes a `noul` instead of a Haiku call, and it is **downgrade-only** — a Jev verdict
  can mark an exit-0 run as failed, and can never turn a failed run into a pass.
- **Bash guard, per project.** See [the guard](#the-bash-guard-is-per-project) below.
- **Headless browsing.** `specweave jev browse` runs a Playwright loop where Jev picks the
  next click, scroll, back or done from the observed interactive elements, and no visible
  window is ever opened. See [browser delegation](#browser-delegation-across-tools).

## The guard verdict

`specweave jev guard "the command"` asks two questions — a `choice` over the command's
scope and a `noul` for "would this destroy data that cannot be recovered from git or by
re-running a build?" — and turns the pair into one verdict.

It **denies** on any of four arms:

1. scope `destructive_remote` with confidence at or above `guardDeny` (0.85);
2. destructiveness at or above `guardDeny` with scope `local_irreversible` or
   `destructive_remote`;
3. scope `local_irreversible` with confidence at or above `guardDeny` **and**
   destructiveness at or above `guardWarn` (0.5);
4. the probabilities of `local_irreversible` and `destructive_remote` **summed** at or
   above `guardDeny`, with destructiveness at or above `guardWarn` — a `deleteMany`
   against a database Jev cannot place splits the scope 0.50 / 0.45 and would otherwise
   fall to a warn.

The third arm exists because a near-certain local wipe scores its *scope* high and its
*destructiveness* only moderately: `rm -rf ~/Projects` comes back `local_irreversible` at
0.99 with destructive 0.81, which the first two arms alone let through as a warn.

It **warns** when destructiveness reaches `guardWarn`, or the scope is `shared_or_remote`,
`local_irreversible` or `destructive_remote` — `destructive_remote` is in the warn set so
a low-confidence remote-destruction reading degrades to warn instead of falling through to
allow. Everything else is allowed.

### The prefilter, and what it means

A regex prefilter runs before any call. `npm test`, `npm run build` / `test` / `lint`,
`pnpm test`, `yarn test`, `cargo test`, `go test` and plain read commands (`ls`, `cat`,
`grep`, `rg`, `find`, `git status` / `log` / `diff` / `show`, and friends) skip Jev
entirely, so the common case costs nothing — and **project-defined scripts are therefore
trusted by the guard**: whatever `npm test` runs in a repo is never scored.

### The Bash guard is per project

Default hooks are unchanged from 2.1.0: `SessionStart` and `Stop`. `PreToolUse` is **not**
registered in `plugins/specweave/hooks/hooks.json`, so upgrading does not turn a guard on
anywhere. You enable the Bash guard one project at a time:

```bash
specweave jev setup --guard-bash      # config flag + marker + project hook
specweave jev setup --no-guard-bash   # removes all three
```

`--guard-bash` does three things: it sets `jev.guards.bash` in `.specweave/config.json`,
writes the marker `.specweave/state/jev-guard.enabled`, and registers a project-level
Claude Code hook in `.claude/settings.json` — `hooks.PreToolUse`, matcher `Bash`, command
`node "<installed specweave>/plugins/specweave/hooks/run.mjs" pre-tool-use`.
`specweave jev doctor` shows the marker and the project hook.

A deny verdict blocks the command with the probabilities in the reason; a warn verdict
attaches them as context; any error, timeout, missing key or disabled config fails open.
Without the marker the hook returns `{}` without loading anything.

This is a Claude Code surface. Other tools — Codex, Cursor, Gemini CLI — call
`specweave jev guard "the command"` explicitly before running anything unattended.

The guard's escape hatch is an environment variable set in the shell that launches the
agent, or `--no-guard-bash`. A bypass prefix typed in front of a command does nothing: a
denied command is for the user to approve, not for the agent to route around.

## Browser delegation across tools

| Tool | Use |
|---|---|
| Claude Code, Cursor, Gemini CLI | `specweave jev browse` — one headless Playwright loop, the same JSON everywhere |
| Codex app, with Computer Use and a browser attached | the community `jev-browser-use` skill |
| Codex app, without a browser attached | `specweave jev browse` |

The loop is headless by definition and never opens a visible window. Text is typed only
from `--input Label=value` — never a string Jev chose. `jev.browse.allowDomains` and the
repeatable `--allow-domain` flag are **merged**, and the `--url` a run starts from must
already be inside that allow-list. A control counts as sensitive by its **label or its
link target** (pay, delete, buy, sign out, and similar) and is skipped unless
`--allow-sensitive` is passed.

## Patterns for your own project

1. **Find the closed sets.** Walk your flows and mark every LLM call whose only job is to
   pick one of a handful of outcomes: intent routing, moderation triage, write-approval
   gates, dedupe, rerank, tagging.
2. **One constants file.** Keep every question in a single module and import it. The
   wording is the contract; editing it at a call site silently changes behaviour.
3. **Fan out.** Independent questions over the same state belong in one request. They run
   in parallel and cannot see each other's answers, so ask speculative branch questions up
   front and consume only the answers the chosen branch needs.
4. **Confidence gate.** Every consumer needs a documented threshold and a fallback for
   below it. Without one the probability is decoration.
5. **Cascade.** Jev first, frontier model only for the cases it is unsure about. Measure
   accuracy, latency and cost before and after.

## Usage ledger

Every call appends one line to `.specweave/state/jev-usage.jsonl` with the timestamp,
kind, provider, model, token counts, cost and latency. `specweave jev usage` totals it.

## Limits and anti-patterns

- Up to 32k tokens of state per question and 64k per request. Summarise in code first.
- Between 2 and 255 options for a `choice`; between 2 and 10 levels for a `score`.
- Weak at counting, arithmetic, dates and ordering by number. It reads literally.
- Susceptible to injected instructions: screen untrusted text as **data** with a `noul`
  and never make the screened text the question.
- Never ask it to write code, specs, commit messages or reviews, to compact or summarise,
  or to judge another model's free-text output.
- Errors: 401 auth, 422 validation, 429 rate limit, 529 overloaded. SpecWeave retries 429
  and 529 with backoff and fails open on everything else.

## Related

- The `sw:jev` plugin skill and the portable `sw-jev` skill ship the same guidance to
  agents; install the portable one with `npx vskill install anton-abyzov/specweave/sw-jev`.
- TypeSafe's own docs index: [docs.typesafe.ai/llms.txt](https://docs.typesafe.ai/llms.txt)
  (append `.md` to any docs path for Markdown).
