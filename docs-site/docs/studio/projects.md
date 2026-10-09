---
title: Studio projects
description: Organize ongoing work with a coordinator, independent Claude Code and Codex threads, shared memory and project settings.
---

# Studio projects

A project groups work around an outcome and a working folder. Its coordinator keeps the conversation together; worker threads carry out individual assignments. Choose a provider and model for each thread, including the coordinator. A project can contain both Claude Code and Codex workers.

:::info 0.2 preview
This guide describes the Studio 0.2 implementation under release verification. Public installation and recorded tutorials will be added after artifact and application acceptance. The SpecWeave CLI installation guide installs the CLI, not Studio.
:::

## Set up your project

Open the project from Studio's overview, then choose **Settings**. Give it a clear name and goal, such as “Make checkout reliable on mobile.” Select the coordinator model and the default worker model independently. Available choices come from providers configured on that host; an example model name does not guarantee that your account offers it.

Use **Memory → Project instructions** for standing rules: the target branch, useful test commands and decisions that apply to all work. Keep the goal about the outcome. Put detailed facts in [project memory](./memory-and-usage.md).

Check **Environment** before starting work. Studio identifies a project by its host and registered folder. An umbrella folder can contain several repositories. A matching Git remote does not automatically merge projects on different machines, synchronize memory or grant file access. Each machine keeps its own checkout and provider credentials.

## Work through the coordinator

Send a question or assignment in the project conversation. For a follow-up, name the existing thread or describe the work it owns. Reusing the right worker preserves its native conversation; starting a different provider creates a separate conversation.

Click a thread row or a linked thread reference to open it in the right pane. Read its transcript, inspect messages from the coordinator and use its native controls. **Replies from the project’s thread pane pass through the coordinator**, with the selected worker attached as context. The coordinator decides whether to reuse that worker or route elsewhere. Tool approvals remain attached to the specific native request; a general project message is not an approval.

The thread list separates attention from execution:

| Group | Meaning |
| --- | --- |
| Waiting on you | Input, approval or plan review is needed, or the thread has failed or reached a usage limit. |
| Working | The native runtime is active. |
| Idle | The thread is available for another message. |
| Resolved | The thread has been marked settled. Reopen it when related work returns. |
| Archived | The thread is retained in archived history and can be restored. |

Resolving a thread organizes the conversation. It does not prove that tests passed, a change was deployed or acceptance criteria were met. Use [plans and verification](./plans-and-routines.md) when you need that evidence.

## Pause, archive or delete

**Pause new work** blocks new coordinator and routine dispatch. Existing native turns keep their own stop and approval controls. **Archive project** also blocks new work and preserves history; unarchive it to continue. Neither action silently takes over or cancels a running worker.

**Danger zone → Delete project** permanently removes the project, its Studio threads, shared memory and routines. Type the exact project name to confirm. Active work or a pending native request must be finished or stopped first. Source folders and remote Git branches remain intact. Deletion cannot be undone in Studio.

If another window changed the settings, reload the current version before saving again. Review your retained draft instead of overwriting someone else's update.

## Next steps

- [Memory, context and usage](./memory-and-usage.md)
- [Plans and project routines](./plans-and-routines.md)
- [Claude Projects and portable work](../guides/claude-code-projects.md)
