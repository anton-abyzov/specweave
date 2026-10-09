---
title: Plans and project routines
description: Use an optional plan for acceptance and evidence, preserve existing SpecWeave ledgers, and manage routines within their project and host.
---

# Plans and project routines

Start with a conversation. Add a plan when work needs acceptance criteria, owners or verification. Ordinary Studio chat does not require a SpecWeave increment or CLI installation.

:::info Integration status
The 0.2 planning core is implemented; its final interface and end-to-end acceptance are still being verified. The behavior below describes that core. Recorded UI walkthroughs will follow verified application behavior.
:::

## One plan authority

In native Studio mode, a project can keep a short specification, acceptance criteria and tasks. Each task can record an owner and a verification command. Reported completion is separate from a verified result.

| Task state | What it records |
| --- | --- |
| Planned | The work has been defined. |
| In progress | Work is underway. |
| Blocked | A dependency or decision prevents progress. |
| Reported done | Someone reports completion; verification remains separate. |
| Verified | The saved verification command actually completed successfully. |

Verification is an explicit human action that executes the saved command on the project host. Review the command and arguments before running it. A timeout, error or nonzero exit does not pass. Changing the task definition invalidates its current verified status while retaining historical evidence. A resolved chat alone does not change that evidence.

If the project already uses SpecWeave, connect the existing increment as the authority. Studio's optional adapter reads its `spec.md` and `ledger.jsonl`; it does not install the CLI, claim tasks, invoke pickup or maintain a competing editable ledger. An external done entry remains externally reported evidence. Missing or invalid files produce an error rather than silently switching authorities. A native plan can be exported as Markdown; native session histories and caches are not part of that export.

For work outside Studio, the [SpecWeave CLI](../getting-started/installation.md) provides its own [daily loop](../workflows/overview.md) and [explicit handoff](../guides/cross-tool-handoff.md). A thread and an increment are different units: one increment may involve several workers, and a worker may receive several related follow-ups.

## Schedule work in the right project

Open **Settings → Routines → Manage routines**. Confirm the selected project and host before saving a schedule. A routine either continues its bound thread or starts a new thread, according to its configuration. An enabled schedule is not a completed task.

The project view lists its routines, next run, last error, **Run now** and pause controls. Project pause or archive blocks new routine runs, including manual runs. The host running the schedule must be available; Studio does not turn a local schedule into a cloud service when the computer sleeps.

A transport error may leave acceptance uncertain. Retry keeps the same request identity instead of blindly launching another run. If Studio reports an unknown outcome, inspect the previous thread first. Use **I checked the previous run; start a new run** only when you deliberately want a new attempt; the previous attempt may still be working.

Project deletion removes its routines. The optional usage-limit recovery setting arms supported native recovery for new stops; it does not switch accounts, enable paid overage or guarantee quota availability.

The separate [SpecWeave CLI project hub](../guides/portable-projects.md) stores routine definitions. Those definitions are not automatically active Studio schedules. Configure the actual schedule in the host that will execute it.
