---
title: Claude Projects and portable work
description: Distinguish Claude knowledge projects, the coordinating Claude Code Projects beta, and portable plans used by SpecWeave and Studio.
---

# Claude Projects and portable work

Claude uses “projects” for two experiences. Its existing chat projects collect conversations, instructions and uploaded knowledge. The newer Claude Code Projects beta adds an ongoing coordinating conversation and parallel worker threads. Availability differs by plan and rollout; check Anthropic's [project overview](https://support.claude.com/en/articles/9517075-what-are-projects).

## The coordinating Projects beta

Claude can route new work to a fresh worker or reuse an existing one. Each worker has its own context window. The coordinator reads worker reports; cloud workers share project instructions and memory. Workers usually run in the cloud, but supported tasks can use a local folder through Remote Control. Local execution requires the computer to remain available.

The Overview pane opens a worker's transcript beside the conversation. In Claude's documented interface, a message in that worker's own composer goes directly to the worker; a project-conversation follow-up is routed by the coordinator. Approvals must be answered in the affected worker. Coordinator and worker models can be selected independently. Context is managed automatically, while durable decisions belong in project memory. See [Claude Code Projects](https://code.claude.com/docs/en/claude-projects) for current behavior and setup.

## A thread is not an increment

A native thread is an execution conversation. A SpecWeave increment describes a bounded outcome, acceptance criteria, tasks and evidence. There is no required one-to-one mapping. Several workers can contribute to one increment; an existing worker can handle later related requests. A pull request is an output when appropriate, not a requirement for every thread.

For parallel implementation, give workers disjoint file scopes and explicit task ownership. Keep one authoritative ledger. A chat's “done” label, a model's summary and an actual passing verification command are different evidence.

## What travels between tools

Git can carry reviewed source changes, instructions, specifications, factual memory and evidence references. Native conversations, provider caches and credentials are separate. Copying project files does not automatically synchronize Claude's project memory with Codex or another account.

Use [handoff and pickup](./cross-tool-handoff.md) for a deliberate SpecWeave continuation. Preserve the current owner until the handoff is acknowledged; an idle or disconnected session is not permission to take over its work.

[Studio projects](../studio/projects.md) offer a separate provider-neutral workspace, with native Claude Code and Codex threads. Studio's selected-thread replies route through its coordinator, which differs from Claude's documented direct worker composer. Studio's plain planning mode does not require the CLI; its optional SpecWeave adapter preserves an existing increment as the authority.

*Official Claude sources checked 9 October 2026. Beta behavior can change.*
