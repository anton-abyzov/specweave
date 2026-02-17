# Tasks: Fix Errors Page Tab Switching & URL State Batching

## Task Notation

- `[T###]`: Task ID
- `[ ]`: Not started
- `[x]`: Completed

## Phase 1: Core Fix

### T-001: Rewrite useUrlState with microtask batching

**Description**: Replace the current `useUrlState` implementation with a batching-safe version that coalesces multiple setter calls within a single event loop tick into one `setSearchParams` call.

**References**: AC-US3-01, AC-US3-02, AC-US1-01 through AC-US1-05, AC-US2-01 through AC-US2-04

**File**: `src/dashboard/client/src/hooks/useUrlState.ts`

**Implementation Details**:
- Add module-level `pendingUpdates: Map<string, { value: string | null; defaultValue: string }>`
- Add module-level `flushScheduled: boolean` and `setSearchParamsRef` to store the latest setter
- In `setValue`: add update to `pendingUpdates` map, store `setSearchParams` in ref, schedule flush via `queueMicrotask` if not already scheduled
- In flush: iterate `pendingUpdates`, apply all changes to a single `URLSearchParams`, call `setSearchParams` once, clear state

**Status**: [ ] Not Started

## Phase 2: Verification

### T-002: Build dashboard and verify no compile errors

**Description**: Run `npm run build` to ensure TypeScript compiles cleanly.

**References**: AC-US3-03

**Status**: [ ] Not Started

### T-003: Manual verification checklist

**Description**: Verify all error page interactions work in the browser.

**Checklist**:
- [ ] Tab switching: Error Groups → All Errors → Timeline → Sessions → back to Error Groups
- [ ] Search: type query, press Enter → switches to All Errors with filtered results
- [ ] Group click: click count number → switches to All Errors filtered by type
- [ ] Clear all: click clear all → removes both type and search filters
- [ ] URL params: each action updates URL correctly
- [ ] Browser back/forward between tabs
- [ ] IncrementsPage filters still work
- [ ] ActivityPage filters still work

**References**: AC-US1-01 through AC-US1-05, AC-US2-01 through AC-US2-04, AC-US3-03

**Status**: [ ] Not Started
