---
increment: 0228-dashboard-realtime-sse-fix
title: "Dashboard Real-Time SSE Fix"
type: bug
priority: P1
status: planned
created: 2026-02-16
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Dashboard Real-Time SSE Fix

## Overview

Dashboard pages show stale data because they fetch once on mount and never refresh. The SSE push infrastructure works (FileWatcher -> SSEManager -> broadcast) but most client pages don't subscribe to events. Additionally each useSSE() call creates a separate EventSource connection which will exceed browser limits when all pages are wired up.

## User Stories

### US-001: Real-Time Increment Updates (P1)
**Project**: specweave

**As a** developer monitoring my increments
**I want** the Increments page and detail pages to update automatically when increment status changes
**So that** I see accurate data without manual page refresh

**Acceptance Criteria**:
- [x] **AC-US1-01**: IncrementsPage auto-refreshes when any increment metadata or tasks change
- [x] **AC-US1-02**: IncrementDetailPage auto-refreshes when the viewed increment changes
- [x] **AC-US1-03**: Status badges, task counts, and AC counts update within 1 second of file change

---

### US-002: Shared SSE Connection (P1)
**Project**: specweave

**As a** dashboard user with multiple tabs open
**I want** the dashboard to use a single SSE connection shared across all pages
**So that** browser connection limits are not exhausted

**Acceptance Criteria**:
- [x] **AC-US2-01**: Only one EventSource connection exists per browser tab regardless of page count
- [x] **AC-US2-02**: All existing SSE consumers (ErrorsPage, OverviewPage, ActivityPage, Sidebar) work with the shared connection
- [x] **AC-US2-03**: Connection status is available to any component via useSSEStatus hook

---

### US-003: All Dashboard Pages Get Real-Time Updates (P2)
**Project**: specweave

**As a** dashboard user
**I want** all dashboard pages to update in real-time
**So that** I never see stale data anywhere

**Acceptance Criteria**:
- [x] **AC-US3-01**: AnalyticsPage refreshes on analytics-event
- [x] **AC-US3-02**: CostsPage refreshes on cost-update
- [x] **AC-US3-03**: SyncPage refreshes on sync-update
- [x] **AC-US3-04**: NotificationsPage refreshes on notification event
- [x] **AC-US3-05**: ConfigPage refreshes on config-changed event

---

### US-004: Server-Side Reliability (P2)
**Project**: specweave

**As a** dashboard server operator
**I want** the FileWatcher to handle files created after startup and SSEManager to clean up dead connections
**So that** the server is reliable in edge cases

**Acceptance Criteria**:
- [x] **AC-US4-01**: FileWatcher detects and watches files created after server startup
- [x] **AC-US4-02**: SSEManager removes destroyed connections during broadcast

## Out of Scope

- WebSocket migration (SSE is sufficient)
- Dashboard authentication
- Offline/reconnection UI indicators beyond existing Sidebar status dot
