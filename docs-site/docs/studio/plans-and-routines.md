---
title: Plans and project routines
description: Use an optional plan for acceptance and evidence, preserve existing SpecWeave ledgers, and manage routines within their project and host.
---

# Plans and project routines

Start with a conversation. Add a plan when work needs acceptance criteria, owners or verification. Ordinary Studio chat does not require a SpecWeave increment or CLI installation.

:::info 0.2 preview
These project features target Studio 0.2.0 and remain under final native workflow and release verification. See [Studio projects](./projects.md) for version and private-pilot availability.
:::

## One plan authority

Open **Plan → Add a plan** to keep a short specification, acceptance criteria and tasks in Studio. Each task can record an owner and a verification command. Saving a command does not execute it. Reported completion is separate from a verified result.

| Task state | What it records |
| --- | --- |
| Planned | The work has been defined. |
| In progress | Work is underway. |
| Blocked | A dependency or decision prevents progress. |
| Reported done | Someone reports completion; verification remains separate. |
| Verified | The saved verification command actually completed successfully. |

Verification is an explicit human action that executes the saved command on the project host. Review the command and arguments before running it. A timeout, error or nonzero exit does not pass. Changing the task definition invalidates its current verified status while retaining historical evidence. A resolved chat alone does not change that evidence.

Expand **Verification command and evidence** to review the executable, literal arguments, workspace and timeout. **Run verification** needs both terminal and orchestration operation permission. This executes a local command with the host's permissions; it is not a sandbox.

If the response is uncertain, **Recheck last request** looks for the same receipt without starting another process. **New verification attempt** deliberately starts a separate execution. Receipts retain their command, outcome, exit code and bounded output even after the current command changes or is removed. **Ask coordinator** sends the saved task through the project conversation; it cannot grant verification permission.

If the project already uses SpecWeave, connect the existing increment as the authority. Studio's optional adapter reads its `spec.md` and `ledger.jsonl`; it does not install the CLI, claim tasks, invoke pickup or maintain a competing editable ledger. An external done entry remains externally reported evidence. Missing or invalid files produce an error rather than silently switching authorities. A native plan can be exported as Markdown; native session histories and caches are not part of that export.

Use **Plan source** to select or repair the binding. The increment folder must remain inside the registered project folder; register the umbrella folder when the increment belongs above a child repository. A broken source keeps its binding visible for repair and never silently becomes an empty native plan.

For work outside Studio, the [SpecWeave CLI](../getting-started/installation.md) provides its own [daily loop](../workflows/overview.md) and [explicit handoff](../guides/cross-tool-handoff.md). A thread and an increment are different units: one increment may involve several workers, and a worker may receive several related follow-ups.

## Schedule work in the right project

Open **Settings → Routines → Manage routines**. Confirm the selected project and host before saving a schedule. A routine either continues its bound thread or starts a new thread, according to its configuration. An enabled schedule is not a completed task.

The project view lists its routines, next run, last error, **Run now** and pause controls. Project pause or archive blocks new routine runs, including manual runs. The host running the schedule must be available; Studio does not turn a local schedule into a cloud service when the computer sleeps.

A transport error may leave acceptance uncertain. Retry keeps the same request identity instead of blindly launching another run. If Studio reports an unknown outcome, inspect the previous thread first. Use **I checked the previous run; start a new run** only when you deliberately want a new attempt; the previous attempt may still be working.

Project deletion removes its routines. The optional usage-limit recovery setting arms supported native recovery for new stops; it does not switch accounts, enable paid overage or guarantee quota availability.

The separate [SpecWeave CLI project hub](../guides/portable-projects.md) stores routine definitions. Those definitions are not automatically active Studio schedules. Configure the actual schedule in the host that will execute it.

## Video walkthroughs

### Plan, verify and schedule

<video controls playsInline preload="metadata" aria-label="Plan, verify and schedule: captioned Studio walkthrough" poster="/video/studio-projects/plans-and-routines.jpg" width="1920" height="1080" style={{width: '100%', height: 'auto'}}>
  <source src="/video/studio-projects/plans-and-routines.mp4" type="video/mp4" />
  <track kind="captions" src="/video/studio-projects/plans-and-routines.vtt" srcLang="en" label="English" />
  Your browser does not support embedded video. Read the transcript below or <a href="/video/studio-projects/plans-and-routines.mp4">download the video</a>.
</video>

Silent walkthrough with visible English captions and a selectable English caption track. The application uses synthetic project data. Use fullscreen or the transcript for the dense desktop interface on a phone.

<details>
<summary>Read the transcript: Plan, verify and schedule</summary>

1. Add a plan when acceptance needs evidence. Ordinary chat does not require the CLI.
2. Write a short spec, one acceptance criterion and a task.
3. Review the executable and literal arguments. Saving the command does not run it.
4. Verification runs a real local process. A nonzero exit remains failed.
5. We now create ready.txt in the synthetic source folder. The previous failed receipt stays unchanged.
6. Choose a new attempt deliberately. The new receipt records the successful exit.
7. Recheck reads the same receipt. It cannot launch that verification again.
8. An existing SpecWeave ledger stays authoritative. Its done entry remains external, unverified evidence.
9. Routines keep their project and host scope. This demonstration routine is disabled.
10. Pause the project to refuse new work. It does not kill an already running turn.
11. New routine runs remain blocked while the project is paused.
12. Deletion requires the exact project name. This is a disposable synthetic project.
13. Deleting project history leaves its source folder intact.

</details>
