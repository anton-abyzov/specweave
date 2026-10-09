---
title: Project memory and usage
description: Understand shared memory, independent native conversations, cache reporting and the difference between token usage and billed spend in Studio.
---

# Project memory and usage

Share durable facts across your project. Keep each worker's conversation and provider cache with the provider that owns it.

| Kind of context | What belongs there |
| --- | --- |
| Project goal and instructions | The outcome, standing rules and constraints. |
| Project memory | Decisions, useful facts, pitfalls and links to evidence. |
| Project plan | Acceptance criteria, assignments, progress and verification results. |
| Native thread history | The worker's messages, tool calls and provider-managed compaction. |
| Provider cache | Temporary reuse of processed input, when the provider reports it. |

## Keep memory small and useful

Open **Settings → Memory**. Add a Markdown file, edit its contents and save. Use `MEMORY.md` as a short index, with topic files such as `architecture.md` for details. Include the source and date for facts that can change. Store a link to a test receipt rather than pasting an entire log into every thread.

Files are scoped to this Studio project. Saving checks the revision you edited; a conflicting change is rejected so another writer's work is preserved. Read the current version and reconcile the changes before retrying. The same revision check protects deletion.

The current limits are 64 KiB per memory file and 256 KiB per project. Memory names must be plain Markdown filenames, not directory paths. Context sent to a provider is bounded, so a large memory collection does not mean every file is loaded into every turn.

Memory records context, not permission or proof. A note saying “approved” does not answer a pending tool approval. A note saying “finished” does not verify a task.

## Native conversations and caching

Claude Code and Codex keep independent native session histories. Compaction summarizes a conversation to fit its context window; project memory preserves selected facts outside that conversation. Changing providers does not transfer opaque conversation state, native cache entries or account credentials. Carry a concise brief and evidence into a new thread when changing tools.

Reuse a relevant thread for related work, keep standing instructions concise and avoid copying large logs into every request. These practices reduce repeated context. Cache reuse still depends on the native provider, model and prompt. Studio does not promise cache hits or a percentage saving. Claude Code documents matching prefixes and invalidation in its [prompt caching guide](https://code.claude.com/docs/en/prompt-caching).

## Read the usage breakdown

Click **Usage** in the project header. The page shows recorded tokens by model, the coordinator's share and clickable thread rows. A model change does not reattribute old turns to the thread's current model.

**Input** includes cache reads and cache writes. Those columns describe subsets of input; adding them again would double-count usage. Output is separate. The cache read ratio is weighted by input tokens and shown only when the required reporting is complete.

**Not reported** means the provider or stored turn did not supply enough information. Incomplete-usage notices identify missing threads or turns; totals cover known data. Separate subagent usage is excluded from the displayed main-agent totals. An empty synthetic thread has no usage evidence, rather than proof that execution was free.

**Estimated equivalent API cost** is an estimate based on available per-turn usage and pricing information. It is not your subscription bill, money paid or remaining plan allowance. Unknown estimates stay unknown. Check the provider's own billing and quota controls for those quantities.

Return to [Studio projects](./projects.md) or continue with [plans and routines](./plans-and-routines.md).
