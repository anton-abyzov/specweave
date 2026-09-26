---
title: Integrations
sidebar_label: Overview
description: Which AI coding tools and issue trackers SpecWeave works with, and where each is documented.
---

# Integrations

SpecWeave keeps its record in the repository, so it needs no integration to work. Integrations fall into two groups: the AI tools that do the work, and the trackers that mirror it for your team.

## AI coding tools

Claude Code, Codex, Grok Build, Cursor, GitHub Copilot, Gemini CLI and OpenCode all read `AGENTS.md` and can run the `specweave` CLI. You can switch between them in the middle of a task with `specweave handoff` and `specweave pickup`.

- [Codex, Grok, Cursor and other tools](/docs/integrations/generic-ai-tools): what each tool reads and how to run the loop anywhere
- [Cross-tool handoff](/docs/guides/cross-tool-handoff): hand off in one command, pick up in one read
- [Claude Code Projects and threads](/docs/guides/claude-code-projects): one thread, one increment

## Issue trackers

Trackers are optional mirrors. The spec, the ledger and `reports/verify.json` stay the source of truth; a closed issue does not make an increment verified.

Sync is explicit in 3.0. Changing an increment's status never touches a tracker. Only `specweave sync push`, and closing an increment that has a linked issue, write to one.

| Tracker | Support |
|---|---|
| GitHub Issues | First-class |
| Jira | Opt-in: create, update on push, close |
| Azure DevOps | Opt-in: create, update on push, close |

- [GitHub sync](/docs/guides/github-sync)
- [Jira and Azure DevOps](/docs/guides/jira-ado-sync)
- [`specweave sync` reference](/docs/reference/sync-cli)

A rewrite of sync around the 3.0 ledger is planned for 3.1.
