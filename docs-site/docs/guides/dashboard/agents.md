---
title: Agents
description: Monitor agent lifecycles with real-time status, session filtering, and duration tracking
---

# Agents

The Agents page tracks the lifecycle of every agent spawned by SpecWeave. It shows which agents are currently running, which have completed, and provides summary statistics to help you understand agent usage patterns.

## Header Statistics

The page header displays three inline metrics:

- **Total** -- number of agents matching the current filter.
- **Running** -- agents that have started but not yet stopped.
- **Avg duration** -- average duration of completed agents, formatted as a human-readable string (e.g. `2m 30s`).

## Session Filter

A dropdown at the top lets you filter agents by session. Options include:

- **All sessions** -- show every tracked agent.
- Individual session IDs (truncated to 20 characters) -- show only agents spawned in that session.

The session filter is stored in the URL via `?session=` so you can share or bookmark a filtered view.

## Agent Table

A full-width table with the following columns:

| Column | Description |
|--------|-------------|
| Agent ID | First 16 characters of the agent's unique identifier (monospace) |
| Type | The agent type (e.g. `explore`, `implement`, `test`, `grill`) |
| Session | First 12 characters of the parent session ID |
| Started | Local time when the agent was spawned |
| Stopped | Local time when the agent finished, or a dash if still running |
| Duration | Elapsed time -- for running agents, this updates every second in real time |
| Status | Badge showing `running` (green) or `stopped` (gray) |

When no agents have been tracked yet, the table shows a centered empty state message.

### Duration Formatting

Durations are displayed in a human-readable format that adapts to the magnitude:

- Under 1 second: shown in milliseconds (e.g. `450ms`).
- Under 1 minute: shown in seconds (e.g. `32s`).
- Under 1 hour: shown in minutes and seconds (e.g. `4m 12s`).
- 1 hour or more: shown in hours and minutes (e.g. `1h 23m`).

### Sorting and Ordering

Agents are displayed in reverse chronological order based on their start time. Live agents received via SSE appear at the top of the list, followed by historical agents from the API.

## Real-Time Updates

The page subscribes to the `hook-agent` SSE event. When a new agent is spawned or an existing agent completes, the data updates immediately:

- New agents appear at the top of the list.
- When a running agent stops, its row updates with the stopped time, final duration, and a `stopped` badge.
- The running count and average duration recalculate automatically.

Live SSE events are merged with historical data fetched from the API. Deduplication is handled by agent ID -- live data takes priority for agents that already exist in the historical set.

## Live Duration Timer

While any agents are in the `running` state, a one-second interval timer keeps the Duration column updating in real time. The timer stops automatically when all agents have completed, avoiding unnecessary re-renders.

## Data Merging

Historical agent data is fetched from the `/api/hooks/agents` endpoint. Live SSE events are held in a separate buffer and merged with the historical data on each render cycle. When an agent ID exists in both sources, the live version takes priority so that in-progress status updates are reflected immediately without waiting for a full API refresh.

## Launching

Run `specweave dashboard` to open the SpecWeave dashboard. Navigate to the **Agents** page from the sidebar. Agent data is loaded from the `/api/hooks/agents` endpoint.

## See Also

- [Hooks](./hooks.md) -- hook events triggered by agent lifecycle transitions
- [Errors](./errors.md) -- correlate errors with the agents and sessions that produced them
- [Activity](./activity.md) -- agent events also appear in the activity stream
