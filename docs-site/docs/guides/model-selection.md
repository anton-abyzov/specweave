---
title: Models and execution context
description: Record which harness, model, effort, provider and surface carried a piece of work forward, and what that record can and cannot tell you.
---

# Models and execution context

You choose the model in your coding tool. SpecWeave does not route model requests, pick a default model or require a particular tool's plan mode. What it does is record which setup worked on each piece of work, so the next session, in any tool, can see who did what.

The durable record is the **intent, the spec, the task evidence and the handoff**. They let the next session continue when the tool or the model changes.

## Keep the dimensions separate

| Dimension | What it records |
|---|---|
| Harness | The agent application running the work, such as Codex or Claude Code |
| Model | The exact reported model identifier |
| Effort | The reported reasoning setting, when available |
| Provider | The service serving the model; a provider is not a harness |
| Surface | Where the session ran, when its metadata reports it |
| Session | One tool conversation; an intent can continue through several |

Each execution entry also has a timestamp, an actor, a source and an optional note. Missing facts show as **Unknown**. A task claim identifies who claimed it (`<tool>@<host>`); it is not proof of a model or effort setting.

## Record a continuation

From the dashboard:

1. Run `specweave dashboard` and open the intent on the Work board.
2. Add the execution setup by hand, or open **Sessions** and link a local session to the intent.

From the CLI, which works in any tool:

```bash
specweave project show     # find the intent id and its current revision
specweave project work-record --intent <intent-id> --revision <revision> \
  --harness codex --model <exact-model-id> --effort high --note "finished T-03, T-04 next"
```

Only record what you know. Leave out `--model`, `--effort` or `--session` rather than guessing.

When you switch tools, run `specweave handoff` in the old one and `specweave pickup` in the new one. Both are recorded in the increment's ledger, and when a tool exposes its session id (Claude Code and Codex do), `pickup` and task claims add a `session` event with it, so the ledger shows the chain of sessions and accounts. `specweave report` turns that ledger into an HTML timeline. See [Cross-tool handoff](/docs/guides/cross-tool-handoff).

## Local sessions

The dashboard's session reader understands Codex and Claude Code metadata for the current project. It reads bounded windows of large logs, caches unchanged files, and marks coverage as partial when model changes in between may be missing. It does not expose prompts, responses or tool payloads. A session is never linked to an intent just because they share a project; you link it.

## Compare outcomes with evidence

Execution history shows which setups worked on an intent. To judge the result, read the linked spec, the task evidence and the current `reports/verify.json`. A model name, a card in Done or a token count is not a quality score, and the dashboard does not rank models.

Reading the board and local session metadata makes **no model API calls**. [Usage and cost tracking](/docs/reference/cost-tracking) covers token records and their limits.

## See also

- [Dashboard](/docs/guides/dashboard)
- [Portable projects](/docs/guides/portable-projects)
- [Jev](/docs/guides/jev-system-one) for suggesting a model tier per task
