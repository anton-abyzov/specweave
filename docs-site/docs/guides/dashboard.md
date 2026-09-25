---
title: Dashboard
description: The local SpecWeave dashboard, what each page shows, and what it can change.
---

# Dashboard

`specweave dashboard` opens a local web view of your project: the work board, increment evidence, sessions, tracker connections and a set of diagnostic pages. It reads the same files the CLI writes and makes no model API calls.

## Launch

```bash
specweave dashboard                          # start (or reuse) the dashboard and open a browser
specweave dashboard --no-browser             # print the URL only
specweave dashboard --port 3457 --no-browser
```

Run it from inside an initialized project. The default port is 3456; if it is taken, the next free port up to 20 higher is used. The server listens on `127.0.0.1` only.

One dashboard runs per machine. Running `specweave dashboard` from a second project registers that project with the running dashboard and opens it; switch between projects with the Workspace selector in the sidebar. Stop the dashboard with Ctrl+C in the terminal that started it.

## Main pages

These five are always in the sidebar.

| Page | Shows | Source |
|---|---|---|
| **Project hub** | The project's name, goal and shared context, work in motion, linked artifacts, routines, and a worker brief you can hand to Codex, Claude Code or another tool | `.specweave/project/hub.json` |
| **Work board** | Intents in Backlog, In progress, Blocked, Review and Done, with counts of blocked work, finished tasks and verified increments | `.specweave/intents/board.jsonl` and the increments |
| **Evidence** | Every increment with task and acceptance criteria progress. Open one for its spec, verify report, latest handoff and per-task evidence | `.specweave/increments/` |
| **Sessions** | Local Codex and Claude Code sessions for this project, with harness and model, which you can link to an intent | Local session metadata |
| **Connections** | Tracker health: sync permissions, audit log, recent sync errors and conflicts, a connection check per provider, and a **Sync Now** button that runs `specweave sync push` | Sync config and logs |

### Work board

**New intent** records a title and summary. Small work can stay an intent; link an increment when it needs acceptance criteria and checks. Move cards by dragging them or with the state selector.

A card's column is a planning state only. Moving a card to Done does not complete the increment, and a card is shown as verified only when the linked increment has a current passing `reports/verify.json`. A passing report older than the latest change shows as stale.

Open a card to see its linked increment, progress and execution history: which tool, model, effort and provider carried it forward, taken from the ledger, from linked sessions or entered by hand. Unknown facts stay "Unknown". See [Models and execution context](/docs/guides/model-selection).

The board and the project hub refresh on file changes and every 15 seconds.

### Project hub

The hub is the dashboard view of `specweave project`. Edit the brief, add work, link artifacts (project files or HTTPS links) and store routines. **Portable worker brief** produces text for a fresh session in another tool. Routines are stored instructions with a requested cadence; nothing runs them on a schedule. See [Portable projects](/docs/guides/portable-projects).

### Connections

**Verify Connection** checks that the configured GitHub, Jira or Azure DevOps credentials can reach the target; it reads and never writes issues. **Sync Now** runs `specweave sync push` and streams its output. Nothing on this page runs on its own. See [GitHub sync](/docs/guides/github-sync).

## Diagnostics and settings

Expand **Diagnostics & settings** in the sidebar for the rest.

| Page | Shows |
|---|---|
| **Overview** | Active and completed increments, recent activity and recent sync errors |
| **Activity** | A combined stream of the local event, decision, notification and cost logs, where they exist |
| **Usage & estimates** | Token counts from local Claude Code logs for this project, with estimated API cost. See [Cost tracking](/docs/reference/cost-tracking) |
| **Analytics** | Command and skill events from `.specweave/state/analytics/events.jsonl`. 3.0 no longer records these, so the page shows only history from earlier versions |
| **Errors** | Tool errors found in local Claude Code session logs, grouped by type and session |
| **Notifications** | Entries in `.specweave/state/notifications.json`, which you can dismiss |
| **Workspace** | The repositories in the `workspace` config and their GitHub, Jira or Azure DevOps mapping. You can add, edit and remove entries |
| **Repositories** | Git repositories found under the project folder and whether each has SpecWeave |
| **Plugins** | Installed plugins and skills, LSP status, and buttons for `specweave lsp status` and `specweave refresh-plugins` |
| **Marketplace** | An experimental skill scanner. It stays disabled unless configured and is not part of the 3.0 workflow |
| **Hooks** and **Agents** | Hook events posted to the dashboard. The default SessionStart and Stop hooks do not post there, so these pages are usually empty. Use `specweave hooks log` for hook warnings and blocks |
| **Services** | The dashboard server itself and links to the project's docs, repository and tracker |
| **Settings** | `.specweave/config.json`, with validation before you save |

Empty pages are normal. A page shows only what exists on disk, and an empty log is not evidence that nothing happened.

## What the dashboard can change

The dashboard writes only when you act:

- intents on the work board and entries in the project hub
- `.specweave/config.json` from Settings, and workspace repositories from Workspace
- dismissed notifications
- the time of the last successful connection check, in the local sync metadata

The server will run only four CLI commands: `specweave sync push`, `specweave refresh-plugins`, `specweave lsp status` and `specweave doctor`. The first three have buttons. It never changes increment status, the ledger or your code.

## See also

- [Models and execution context](/docs/guides/model-selection)
- [Portable projects](/docs/guides/portable-projects)
- [Cross-tool handoff](/docs/guides/cross-tool-handoff)
