---
title: "Review with another model: Codex reviews Claude's code, Claude reviews Codex's"
sidebar_label: Review with another model
description: "specweave review hands an increment's diff to a reviewer from another model family than the one that wrote it, saves the review in reports/ and exits 0 to ship or 3 to fix first. Setup, reviewers, configuration and CI use."
---

import TutorialEmbed from '@site/src/components/TutorialVideo/TutorialEmbed';

# Review with another model

A model reviewing its own code tends to agree with itself. `specweave review` gives the increment's diff to a reviewer from a different model family: Codex for code Claude wrote, Claude for code an OpenAI model wrote. The review lands in the increment folder and the exit code tells you, or your script, whether to ship.

<TutorialEmbed slug="review-with-another-model" />

Added in SpecWeave 3.1.0 (17 October 2026, [CHANGELOG](https://github.com/anton-abyzov/specweave/blob/develop/CHANGELOG.md)).

```bash
specweave review            # the active increment
specweave review 0042       # a specific one
```

## What happens

1. **It finds the author.** The ledger records which tool finished each task (`claude@laptop`, `codex@m4`). The family that finished the most tasks counts as the author.
2. **It builds a brief.** The brief holds what the increment promised (its acceptance criteria, Approach and tasks with their files), the glossary terms when `GLOSSARY.md` exists, and the diff of the task files since the merge-base with `origin/HEAD` (or `--base <ref>`). A diff above 150,000 characters is left out and the reviewer runs `git diff` itself.
3. **It picks a reviewer from another family.** Built in are two:

   | Reviewer | Runs | Used for |
   |---|---|---|
   | `codex` | `codex exec` with GPT-6.1-Sol at high reasoning, in a read-only sandbox | Code written by Claude, or when the author is unknown |
   | `claude` | `claude -p --model opus` in plan mode | Code written by an OpenAI model |

   SpecWeave holds no model keys. Each reviewer CLI uses the sign-in already on your machine.
4. **It saves the review.** The answer goes to `reports/review-<reviewer>.md` in the increment folder, with a header naming the reviewer, the author family, the base and head commits and the time. Each run is also kept as `reports/reviews/review-<reviewer>-<n>.md`, so a second review does not erase the first. A note in `ledger.jsonl` records the verdict and the file of that run, so `pickup` shows it to whoever comes next.
5. **It exits with the verdict.**

   | Exit | Meaning |
   |---|---|
   | `0` | Ship |
   | `3` | Fix first, or the reviewer gave no verdict line |
   | `1` | An error: no reviewer installed, no base branch, the reviewer failed or timed out |

   A reviewer that fails or times out never counts as a pass, whatever it printed.

After exit 3, fix every critical and high finding (or add a task for it), run `specweave verify`, and review again.

## Without a second CLI

`specweave review --brief` prints the brief and runs nothing. Paste it into any model you have access to, in a browser or another tool, and read its answer yourself. Nothing is written to `reports/` in that case.

## Options

| Flag | What it does |
|---|---|
| `--reviewer <name>` | Use this reviewer instead of choosing one: `codex`, `claude` or one you configured |
| `--base <ref>` | Diff against this ref instead of the merge-base with `origin/HEAD` |
| `--timeout <minutes>` | Stop the reviewer after this long (default 30) |
| `--brief` | Print the brief only |
| `--json` | Print reviewer, family, author, verdict, report path, base and head as JSON |

If you name a reviewer from the same family as the author, the review still runs and says plainly that it is not a cross-model review.

## Configure it

In `.specweave/config.json`:

```json
{
  "review": {
    "crossModel": true,
    "reviewer": "auto",
    "timeoutMinutes": 30,
    "reviewers": {
      "codex": { "command": "codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check -o {out} -" }
    }
  }
}
```

- `crossModel: true` makes the review and done skills run `specweave review` without being asked.
- `reviewer` names a fixed reviewer; `auto` (the default) picks the first installed one from another family, Codex first.
- `reviewers` adds a reviewer or overrides a built-in one. The command reads the brief on stdin and answers on stdout, or into `{out}` when the command names it.

Every key is in the [configuration reference](/docs/reference/configuration#review).

## Where it fits

The daily loop is plan, work, verify, review, complete. `specweave verify` proves the tests, lint and build pass; `specweave review` asks a second model whether the change is right. `specweave complete` checks `reports/verify.json`, not the review, so a team that wants the review to gate closing sets `review.crossModel` and lets the done skill run it. See [the daily loop](/docs/workflows/overview).
