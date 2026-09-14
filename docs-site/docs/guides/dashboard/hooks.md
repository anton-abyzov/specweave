---
title: Hooks
description: The two default lifecycle hooks and the limits of hook diagnostics in SpecWeave 2.1
---

# Hooks

SpecWeave 2.1 installs **two default lifecycle hooks**. They provide compact continuation context and support an explicitly enabled auto loop.

| Hook | Default behavior |
|---|---|
| SessionStart | Reads local open intents, active increments, task state and the latest handoff pointer; supplies compact context when present |
| Stop | Lets an ordinary session stop; requests continued work only when an active auto-mode marker exists |

The default manifest does not install PreToolUse, PostToolUse or PreCompact hooks. It does not inspect every tool call to force a workflow, choose a model, or create complete invocation telemetry. Other installed plugins and user hooks have their own configurations.

## Explicit automation and handoffs

Use the installed `sw:auto` skill to enable the auto loop deliberately. Stop reads remaining task and acceptance-criteria state and has age, turn-count and no-progress guards. It does not independently verify code or mark an increment complete.

Write `specweave handoff` when handing work to another session or tool. Handoffs are explicit CLI actions in the default 2.1 setup. SessionStart can point the next session to the resulting owned document, including lightweight work without an increment.

Reading this local state requires **no model API calls**. Context supplied to a running agent can still occupy that agent's context window, and an explicitly continued auto turn uses the selected agent's normal inference.

## Diagnostic view

Launch without opening a browser automatically:

```bash
specweave dashboard --no-browser
```

Open the printed URL, expand **Diagnostics & settings**, and choose **Hooks**. The page displays available hook-event records, filters them by event type, session and time, and merges incoming events with recorded history. Repeated event types can be expanded as groups; recorded deny or block decisions are highlighted.

The filter includes historical and optional event types. Its presence does not mean those hooks are installed, or that every hook execution was recorded. An empty log is not evidence that no work occurred. Use the [Work board and task evidence](/docs/guides/analytics-dashboard) for progress, and [execution context](/docs/guides/model-selection) for known session/model information.
