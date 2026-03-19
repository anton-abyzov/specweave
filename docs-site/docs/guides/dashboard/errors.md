---
title: Errors
description: Trace and investigate errors across Claude Code sessions with grouping, timeline, and session context
---

# Errors

The Errors page provides observability into errors that occur during Claude Code sessions. It collects errors from session logs, groups them by type, and gives you tools to search, filter, and drill into the context surrounding each failure.

## KPI Summary

Four cards at the top of the page give you an at-a-glance health picture:

- **Total Errors** -- cumulative count of all recorded errors.
- **Error Types** -- number of distinct error categories detected.
- **Affected Sessions** -- how many sessions have at least one error.
- **Most Common** -- the error type that appears most frequently.

## Search

A full-text search bar lets you find errors by message content, tool name, or context. Pressing Enter or clicking **Search** filters the list and switches to the All Errors tab automatically. A clear button resets the search.

## Tabs

### Error Groups

The default view. A table that clusters errors by type and shows, for each group:

| Column | Description |
|--------|-------------|
| Type | Error category badge (e.g. `prompt too long`, `api error`, `tool failure`, `hook error`, `rate limit`) |
| Count | Total occurrences -- click to jump to the All Errors tab filtered by that type |
| Sessions | Number of distinct sessions affected |
| Last Seen | Exact timestamp of the most recent occurrence |
| Sample Message | First message from the group for quick identification |

### All Errors

A paginated list of individual errors (50 per page). Each row shows the error type badge, a truncated message, the timestamp, a relative time label, and the session ID. Clicking a session ID navigates to the Sessions tab with that session selected.

Long messages (over 120 characters) are expandable. When expanded, the row also reveals:

- **Tool context** -- the tool name and input that triggered the error.
- **Preceding action** -- what the agent was doing right before the failure.
- **Recent tool chain** -- the numbered sequence of tool calls leading up to the error.

### Timeline

A density chart showing error counts per hour as vertical bars. Each bar is clickable -- selecting a time bucket filters the error list below the chart to that window. A color-coded legend maps bar colors to error types (`tool_failure`, `prompt_too_long`, `api_error`, `hook_error`, `rate_limit`, `unknown`). Clicking an individual error row in the timeline navigates to the session detail.

### Sessions

A table of recent sessions that have encountered errors. Columns include:

| Column | Description |
|--------|-------------|
| Session | Truncated session ID |
| Branch | Git branch active during the session |
| Messages | Total conversation messages |
| Tool Calls | Number of tool invocations |
| Errors | Count with a colored badge |
| Started | Session start timestamp |

Clicking a row opens the **Session Detail Panel**.

## Session Detail Panel

When you select a session, an overlay replaces the tab content and shows:

- Session metadata: ID, version, git branch, message count, tool call count.
- Start and end timestamps.
- A chronological list of every error in that session with expandable messages, tool context, message index, and the full causal chain (preceding action and recent tool chain).

A **Back** button closes the overlay and returns to the previous tab.

## Real-Time Updates

The page subscribes to the `error-detected` SSE event. When the dashboard server detects a new error, all data on the page refreshes automatically without a manual reload.

## Launching

Run `specweave dashboard` to open the SpecWeave dashboard. Navigate to the **Errors** page from the sidebar. All tab selections and filters are stored in the URL so you can share or bookmark a specific view.

## See Also

- [Activity](./activity.md) -- real-time event stream including error-level events
- [Hooks](./hooks.md) -- hook execution log for investigating `hook_error` types
- [Agents](./agents.md) -- agent lifecycle tracking for correlating errors with agent sessions
