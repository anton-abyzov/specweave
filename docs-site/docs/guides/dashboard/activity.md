---
title: Activity
description: Real-time activity stream with live SSE events, category filters, and severity levels
---

# Activity

The Activity page is a live event feed that aggregates everything happening in your SpecWeave project. Events arrive via Server-Sent Events (SSE) and merge with historical data from the API, giving you a continuously updating view of commands, hooks, notifications, and cost events.

## KPI Summary

Four cards at the top provide quick counts:

- **Total Events** -- deduplicated count of all events (live and historical).
- **Errors** -- events with `error` severity.
- **Warnings** -- events with `warning` severity.
- **Sources** -- number of distinct event sources (e.g. CLI, dashboard, hooks).

## Live Indicator

A pulsing green dot next to the "Live" label in the header confirms the SSE connection is active. New events appear at the top of the list in real time without requiring a page refresh.

## Filters

Two filter bars let you narrow the event stream:

**Category filter** -- toggle between:
- All
- Commands
- Hooks
- Notifications
- Cost

**Severity filter** -- toggle between:
- All Levels
- Errors
- Warnings
- Info

A count label next to the filters shows how many events match the current selection. Both filters are stored in the URL for sharing and bookmarking.

## Event List

Events are displayed in a single scrollable list. Each row shows:

- A colored severity dot (rose for error, amber for warning, gray for info).
- A category icon (terminal for commands, link for hooks, bell for notifications, dollar sign for cost).
- The event title and a category badge colored by severity.
- A truncated detail line (when collapsed).
- The event source (e.g. `via cli`, `via dashboard`).
- A relative timestamp.

### Expanding an Event

Click any row that has a detail or metadata payload to expand it. The expanded view shows:

- **Detail** -- the full event detail text, preserving whitespace.
- **Metadata** -- a pretty-printed JSON block of the event's metadata object.

## Deduplication

Live SSE events and historical API data are merged and deduplicated by a composite key of timestamp and title. This prevents duplicate entries when a new event arrives while historical data already contains it.

## Event Types

The activity stream captures several categories of events:

| Category | Examples |
|----------|----------|
| Commands | CLI command executions (`specweave do`, `specweave validate`, etc.) |
| Hooks | Hook triggers and their outcomes (allow, deny, block) |
| Notifications | Generated alerts from sync, validation, or marketplace |
| Cost | Token usage and API cost tracking events |

Each event carries a `source` field identifying where it originated (e.g. `cli`, `dashboard`, `hook-engine`).

## Loading More

The initial fetch loads 200 events. If more events match the current filters, a **Load more events** button at the bottom of the list fetches the next 200.

## Launching

Run `specweave dashboard` to open the SpecWeave dashboard. Navigate to the **Activity** page from the sidebar. The page begins streaming events immediately upon load.

## See Also

- [Errors](./errors.md) -- dedicated error investigation with grouping and session context
- [Hooks](./hooks.md) -- hook-specific event log with consecutive collapsing
- [Notifications](./notifications.md) -- notification events with dismiss actions
