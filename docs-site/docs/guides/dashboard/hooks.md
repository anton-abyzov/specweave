---
title: Hooks
description: Browse hook execution history with event type filters, time ranges, and consecutive event collapsing
---

# Hooks

The Hooks page displays a chronological log of every hook event fired during Claude Code sessions. It provides filters for event type, session, and time range, and collapses consecutive runs of the same event type to keep the log readable.

## Header

The page title shows "Hook Events" alongside a count of events matching the current filters (e.g. `142 events`).

## Filters

Three filter controls let you narrow the event log:

### Event Type

A dropdown with all supported hook event types:

- All
- PreToolUse
- PostToolUse
- Stop
- SubagentStop
- TaskCompleted
- UserPromptSubmit
- PostToolUseFailure
- PermissionRequest
- SessionStart
- SessionEnd
- Notification
- SubagentStart
- ConfigChange
- PreCompact
- TeammateIdle

### Session ID

A text input that filters events by session ID substring match. Type any portion of a session ID to narrow results.

### Time Range

A dropdown to limit events to a time window:

- All time
- Last 1h
- Last 6h
- Last 24h

All three filters are stored in the URL via query parameters (`?eventType=`, `?session=`, `?range=`) for sharing and bookmarking.

## Consecutive Collapsing

When the same event type fires multiple times in a row, the log collapses them into a single group header showing the count and type (e.g. `3x PreToolUse`). Click the group header to expand and see every individual event within the run. This keeps the log compact when repetitive hooks fire in sequence.

## Event Timeline

Each event row shows:

- A relative timestamp (e.g. `2m ago`, `3h ago`) in monospace.
- An event name badge. Events with a `deny` or `block` decision are highlighted with a red badge and a red-tinted background.
- A truncated session ID.
- The execution duration in milliseconds (when recorded).

### Expanding an Event

Click any event row to toggle its expanded view. The expanded section shows the full event payload as pretty-printed JSON in a scrollable code block (max height 256px).

## Deny / Block Highlighting

Hook events where the result decision is `deny` or `block` get special visual treatment: a red-tinted background and a red error-variant badge. This makes it easy to spot permission denials and blocked actions in the log.

## Real-Time Updates

The page subscribes to the `hook-event` SSE event. New events arrive in real time and are merged with historical data. Deduplication is handled by event ID -- live events that already exist in the historical set are not duplicated. All events are sorted by timestamp in descending order.

## Data Source

Events are loaded from `/api/hooks/events?limit=200`. Live events received via SSE are kept in a rolling buffer of 50 entries and merged with the historical dataset on each render.

## Launching

Run `specweave dashboard` to open the SpecWeave dashboard. Navigate to the **Hooks** page from the sidebar. The page begins streaming events immediately upon load.

## See Also

- [Agents](./agents.md) -- agent lifecycle events that trigger hook events like SubagentStart and SubagentStop
- [Errors](./errors.md) -- `hook_error` type errors investigated on the Errors page
- [Activity](./activity.md) -- hook events also appear in the activity stream under the Hooks category
