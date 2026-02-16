# Implementation Plan: Dashboard Real-Time SSE Fix

## Overview

Replace per-component EventSource connections with a shared React context provider. Wire all dashboard pages to SSE events for real-time updates. Fix server-side edge cases in FileWatcher and SSEManager.

## Architecture

### Shared SSE Provider

```
App.tsx
  └─ ProjectContext.Provider
      └─ SSEProvider (single EventSource)
          ├─ Sidebar (notification, status)
          ├─ IncrementsPage (increment-update)
          ├─ IncrementDetailPage (increment-update)
          ├─ ErrorsPage (error-detected)
          ├─ OverviewPage (activity)
          ├─ ActivityPage (activity)
          ├─ AnalyticsPage (analytics-event)
          ├─ CostsPage (cost-update)
          ├─ SyncPage (sync-update)
          ├─ NotificationsPage (notification)
          └─ ConfigPage (config-changed)
```

### New Files

- `src/dashboard/client/src/contexts/SSEContext.tsx` — SSEProvider + useSSEEvent + useSSEStatus
- `tests/unit/dashboard/server/file-watcher.test.ts` — FileWatcher tests
- `tests/unit/dashboard/server/sse-manager.test.ts` — SSEManager tests

### Key Design Decisions

1. **Context over singleton**: React context is the idiomatic way to share a single resource
2. **Callback ref pattern**: Prevents stale closure bugs in event handlers
3. **refreshKey pattern for data pages**: Incrementing a counter triggers useApi refetch via URL change — proven pattern from ErrorsPage
4. **Direct state update for streaming pages**: OverviewPage and ActivityPage append items directly — no refetch needed

## Implementation Phases

### Phase 1: Server fixes (independent)
- SSEManager destroyed connection cleanup
- FileWatcher late-file detection

### Phase 2: SSE Provider + hooks
- Create SSEContext with single EventSource
- Create useSSEEvent and useSSEStatus hooks

### Phase 3: Migrate existing consumers
- Refactor ErrorsPage, OverviewPage, ActivityPage, Sidebar to use shared provider

### Phase 4: Wire up missing pages
- Add useSSEEvent to all remaining pages

### Phase 5: Cleanup
- Remove old useSSE hook or make it a thin wrapper
