---
title: Models and execution context
description: Record the harness, model, effort, provider and surface that carried an intent forward
---

# Models and execution context

In SpecWeave 2.1, choose the model in your coding tool. The work board records execution context; it does not route model requests, select a universal default, or require a particular harness's plan mode.

The durable record is the **intent, specification, task evidence and handoff**. These let the next session continue the work even when the tool or model changes.

## Keep the dimensions separate

| Dimension | What it records |
|---|---|
| Harness | The agent application running the work, such as Codex or Claude Code |
| Model | The exact reported model identifier |
| Effort | The reported reasoning setting, when available |
| Provider | The service serving the model; a provider is not automatically a harness |
| Surface | Where the session originated, when its metadata reports this |
| Session | One tool conversation; an intent can continue through several sessions |

An execution entry also has a timestamp, actor, source and optional note. Missing facts display **Unknown**. A task claim identifies the recorded actor; it is not proof of a model or effort setting.

## Record a continuation

1. Open `specweave dashboard` and select the intent on the Work board.
2. Add the execution setup explicitly, or use **Sessions** to link an available local session to that intent.
3. When switching tools, write `specweave handoff` and give the resulting document to the next session. Link its session or add its setup to the same intent.

The local session reader supports Codex and Claude Code metadata associated with the project. It reads bounded windows, caches unchanged files, and marks partial coverage when intermediate changes may be missing. It does not expose transcript prompts, responses or tool payloads in the session API. Unsupported formats or absent metadata remain unavailable; sessions are never assigned to an intent just because they share a project.

## Compare outcomes with evidence

Execution history shows which setups worked on an intent. Inspect the linked specification, task evidence and current verification report to assess the result. A model name, completed card or token count alone is not a quality score, and the dashboard does not produce a causal model ranking or delivery forecast.

Reading the board and local session metadata requires **no model API calls**. It does not consume inference tokens to infer task status. [Usage & estimates](/docs/reference/cost-tracking) has a narrower data source and explicitly leaves unsupported or mixed-model costs unknown.

See the [Work board guide](/docs/guides/analytics-dashboard) and [cross-tool handoff guide](/docs/guides/cross-tool-handoff) for the daily workflow.
