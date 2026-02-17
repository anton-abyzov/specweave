---
increment: 0236-fix-errors-page-tabs
title: "Fix Errors Page Tab Switching & URL State Batching"
type: bug
priority: P0
status: active
created: 2026-02-17
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Bug Fix: Errors Page Tab Switching & URL State Batching

## Overview

The dashboard Errors page (`/errors`) is completely non-interactive beyond its initial load state. All 4 tabs (Error Groups, All Errors, Timeline, Sessions) are visually rendered but clicking any tab other than the default does nothing. Search, group-click filtering, and "clear all" are similarly broken. The root cause is a **batching bug in the shared `useUrlState` hook** where react-router-dom's `setSearchParams` overwrites prior updates when multiple hook instances fire their setters in the same event handler.

## Root Cause

`useUrlState` wraps `useSearchParams()`. Each instance creates its own `setValue` callback that calls `setSearchParams(prev => ...)`. React-router-dom's functional updater passes `searchParams` from the **current render** — not the result of prior queued navigations. When two or more `useUrlState` setters fire synchronously (same click handler), each reads the same stale `prev`, and the last call wins.

### Affected Handlers

| Handler | Line | Setters | Effect |
|---------|------|---------|--------|
| `handleTabChange` | 150 | `setTab` + `setSelectedSession` | Tab never changes |
| `handleSearch` | 104 | `setSearchQuery` + `setTab` | Search query lost |
| `handleGroupClick` | 143 | `setTypeFilter` + `setTab` + `setSelectedSession` | Only session cleared |
| `handleClearFilter` | 156 | `setTypeFilter` + `setSearchQuery` | Only one filter clears |

### Latent risk

IncrementsPage and ActivityPage each use 2 `useUrlState` hooks but currently never call both setters in one handler. If they ever do, they will break identically.

## User Stories

### US-001: Tab Switching Works (P0)
**Project**: specweave

**As a** developer using the SpecWeave dashboard
**I want** to click any tab on the Errors page and see its content
**So that** I can investigate errors by group, individual error, timeline, or session

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Clicking "All Errors" tab switches to the all-errors view and URL updates to `?tab=errors`
- [ ] **AC-US1-02**: Clicking "Timeline" tab shows the error density chart and URL updates to `?tab=timeline`
- [ ] **AC-US1-03**: Clicking "Sessions" tab shows the session list and URL updates to `?tab=sessions`
- [ ] **AC-US1-04**: Clicking "Error Groups" returns to the default view and the `tab` param is removed from URL
- [ ] **AC-US1-05**: Browser back/forward navigation between tabs works correctly

---

### US-002: Search and Filtering Work (P0)
**Project**: specweave

**As a** developer investigating a specific error pattern
**I want** search and type-filtering to work on the Errors page
**So that** I can find relevant errors quickly without scrolling through hundreds of entries

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Typing a query and pressing Enter/clicking Search switches to All Errors tab with results filtered by the query
- [ ] **AC-US2-02**: Clicking an error group's count navigates to All Errors filtered by that error type
- [ ] **AC-US2-03**: "Clear all" button removes both type filter and search query simultaneously
- [ ] **AC-US2-04**: URL reflects all active filters (e.g., `?tab=errors&type=tool_failure&q=sibling`)

---

### US-003: useUrlState Hook is Batching-Safe (P1)
**Project**: specweave

**As a** dashboard developer
**I want** the `useUrlState` hook to handle multiple simultaneous setter calls correctly
**So that** any page using multiple URL-persisted state values can call setters freely without race conditions

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Multiple `useUrlState` setters called in the same synchronous handler produce a single `setSearchParams` call containing all changes
- [ ] **AC-US3-02**: The batching mechanism uses `queueMicrotask` to coalesce within a single event loop tick
- [ ] **AC-US3-03**: Existing pages (IncrementsPage, ActivityPage) continue working with no changes
- [ ] **AC-US3-04**: Unit tests verify that 3 setters called synchronously result in all 3 URL params being set

## Functional Requirements

### FR-001: Microtask-based URL param batching
The `useUrlState` hook must queue param updates into a shared module-level `Map<string, string | null>` and flush all queued updates in a single `setSearchParams` call via `queueMicrotask`. This ensures all synchronous setter calls within one event handler are coalesced.

### FR-002: No page-level changes required
The fix must be entirely within the `useUrlState` hook. ErrorsPage.tsx and other consumers must not need modification — their existing handler code (calling multiple setters) becomes correct automatically.

## Out of Scope

- The `<!DOCTYPE` JSON parse error banner (separate transient API issue, not related to tab switching)
- Adding new features to the Errors page
- Refactoring ErrorsPage component structure

## Dependencies

- react-router-dom `useSearchParams` API (existing dependency)

## Key Files

| File | Role |
|------|------|
| `src/dashboard/client/src/hooks/useUrlState.ts` | The hook to fix (22 lines → ~50 lines) |
| `src/dashboard/client/src/pages/ErrorsPage.tsx` | Primary affected page (no changes needed) |
| `src/dashboard/client/src/pages/IncrementsPage.tsx` | Verify no regression |
| `src/dashboard/client/src/pages/ActivityPage.tsx` | Verify no regression |
