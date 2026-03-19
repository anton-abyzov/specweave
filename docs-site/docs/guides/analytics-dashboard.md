---
sidebar_position: 25
title: Analytics Dashboard
description: Monitor command usage, skill activations, and agent spawns with SpecWeave's built-in analytics dashboard
---

import CommandTabs from '@site/src/components/CommandTabs';

# Analytics Dashboard

SpecWeave tracks every command invocation, skill activation, and agent spawn in a local JSONL file. The built-in dashboard gives you a visual overview of your usage patterns.

## Launching the Dashboard

```bash
specweave dashboard
```

This starts a local web server and opens the dashboard in your browser.

## What Gets Tracked

SpecWeave records three types of events:

- **Commands** -- every `/sw:do`, `/sw:increment`, `/sw:auto`, `/sw:done`, etc.
- **Skills** -- skill activations like `sw:increment`, `sw:grill`, `sw:do`, `sw:done`
- **Agents** -- agent spawns (Explore, general-purpose, Plan, etc.)

### Implicit Tracking

Analytics captures **all** invocations, including implicit ones. When `/sw:team-lead` orchestrates parallel agents and those agents internally invoke skills like `/sw:do` or spawn sub-agents, every call is tracked automatically via PostToolUse hooks. This means the dashboard shows the true volume of work -- not just what the user types, but everything the AI agents do behind the scenes.

Each event includes:

| Field | Description |
|-------|-------------|
| `timestamp` | When the event occurred (ISO 8601) |
| `type` | `command`, `skill`, or `agent` |
| `name` | The command/skill/agent name |
| `plugin` | Source plugin (e.g., `specweave`) |
| `increment` | Active increment context, if any |
| `duration` | Execution time in milliseconds |
| `success` | Whether the execution succeeded |

## Dashboard Pages

The dashboard provides 16 specialized pages. The core pages are described below; detailed documentation for each capability page is linked.

### Overview

Shows increment progress, task completion rates, and acceptance criteria status at a glance. Live-updates via SSE as work progresses.

### Analytics

Displays aggregated usage data: KPI cards (total events, success rate, top commands), daily breakdown over 30 days, top commands/skills/agents ranked by invocation count, and success/failure rates.

### Increments

Browse all increments with filters by status and type. Click any row to see the full detail view with specs, tasks, and progress.

### Costs

Token usage and cost estimates broken down by increment and command.

### Additional Dashboard Pages

| Page | What It Shows |
|------|--------------|
| [Error Tracing](./dashboard/errors) | Error grouping, classification, investigation workflow |
| [Sync Audit](./dashboard/sync) | GitHub/JIRA/ADO sync status and audit log |
| [Activity Stream](./dashboard/activity) | Real-time SSE event feed with category filters |
| [Config Editor](./dashboard/config) | Visual JSON editor for `.specweave/config.json` |
| [Service Management](./dashboard/services) | Running services, port detection, start/stop controls |
| [Notifications](./dashboard/notifications) | Notification feed with severity filters |
| [Marketplace Scanner](./dashboard/marketplace) | Skill discovery pipeline, approve/reject workflow |
| [Plugins](./dashboard/plugins) | Installed plugins, usage stats, health status |
| [Agents](./dashboard/agents) | Agent lifecycle tracking and spawn history |
| [Hooks](./dashboard/hooks) | Hook execution log and event type filters |

## Multi-Project Support

When working with multiple projects, the dashboard uses the `?project=` query parameter to scope all views to a specific project. Navigating between pages preserves the active project context automatically.

Switch projects via the project selector in the header.

## Data Storage

All analytics data is stored locally at:

```
.specweave/state/analytics/events.jsonl
```

- Append-only JSONL format (one JSON object per line)
- Automatic log rotation at 10MB
- 30-day retention by default
- Old events archived to `.specweave/state/analytics/archive/`
- Nothing is sent externally -- all data stays on your machine

## CLI Analytics Command

View analytics from the terminal without the dashboard:

```bash
specweave analytics              # Summary for last 7 days
specweave analytics --since 30d  # Last 30 days
specweave analytics --type skill # Filter by event type
specweave analytics --export csv # Export as CSV
```

## Configuration

Analytics is enabled by default. To disable:

```json
{
  "analytics": {
    "enabled": false
  }
}
```

Add this to your `.specweave/config.json`.
