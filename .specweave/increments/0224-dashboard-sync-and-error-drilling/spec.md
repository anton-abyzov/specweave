---
increment: 0224-dashboard-sync-and-error-drilling
title: "Fix Dashboard Sync Health & Error Drilling"
type: bug
priority: P1
status: in-progress
created: 2026-02-16
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Fix Dashboard Sync Health & Error Drilling

## Overview

Fix broken sync status visualization (shows "0 connected" despite GitHub being configured), broken retry mechanism, and errors page showing 0 errors despite 2,493 real errors. Add error timeline with drill-down.

## User Stories

### US-001: Accurate Sync Status Display (P1)
**Project**: specweave

**As a** developer using the SpecWeave dashboard
**I want** the Sync page to accurately show which platforms are connected
**So that** I can trust the dashboard for monitoring my external tool integrations

**Acceptance Criteria**:
- [x] **AC-US1-01**: ImportCoordinator writes sync metadata on successful import even with 0 items
- [x] **AC-US1-02**: enrichSyncPlatforms() shows "connected" when platform is configured and reachable
- [x] **AC-US1-03**: "Retry Sync" triggers a connectivity check that updates metadata
- [x] **AC-US1-04**: Platform cards show diagnostic messages on failure (auth error, network error)

---

### US-002: Error Visibility and Drill-Down (P1)
**Project**: specweave

**As a** developer using the SpecWeave dashboard
**I want** to see all errors from Claude Code sessions with minute-by-minute timeline
**So that** I can identify patterns, debug issues, and drill into error details

**Acceptance Criteria**:
- [x] **AC-US2-01**: Errors page shows actual error count (2,493+) after server rebuild
- [x] **AC-US2-02**: Timeline tab shows error density per time bucket with visual bar chart
- [x] **AC-US2-03**: Time buckets are clickable to filter errors for that period
- [x] **AC-US2-04**: ClaudeLogParser includes diagnostic logging for troubleshooting

## Out of Scope

- Full re-import from external tools (only connectivity verification)
- Real-time sync conflict resolution UI
- Chart library addition (CSS-only density bars)
