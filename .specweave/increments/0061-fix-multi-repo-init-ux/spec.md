---
increment: 0061-fix-multi-repo-init-ux
title: "Fix Multi-Repo Init UX - Eliminate 'you specified 0' Message"
priority: P1
status: completed
created: 2025-11-24
feature_id: FS-061
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "nodejs-cli"
  testing: "vitest"
---

# Fix Multi-Repo Init UX

## Problem Statement

When users select "Bulk Discovery" to find repositories in the `specweave init` multi-repo flow, they see a confusing message: **"Found 4 repositories, but you specified 0"**.

The user never "specified" any count - they used pattern-based discovery. This message is confusing and creates poor UX.

### Root Cause

1. `repo-bulk-discovery.ts:292-293` - Validation compares `filteredRepos.length !== expectedCount`
2. `repo-structure-manager.ts:513` - Passes `expectedCount=0` as placeholder during bulk discovery
3. The code conflates "count-first" mode (user specifies count) with "discovery-first" mode (user discovers, then selects)

## User Stories

### US-001: Bulk Discovery Without Count
**As a** user setting up multi-repo architecture
**I want** to discover repositories by pattern without specifying a count
**So that** I can see what's available before deciding

**Acceptance Criteria:**
- [x] **AC-US1-01**: No "you specified X" message appears during bulk discovery
- [x] **AC-US1-02**: Discovery shows clear "Found N repositories matching pattern" message
- [x] **AC-US1-03**: User can immediately select parent from discovered repos
- [x] **AC-US1-04**: Remaining repos auto-become implementation repos (no count question)

### US-002: Streamlined Flow
**As a** user
**I want** minimal questions during multi-repo setup
**So that** configuration is fast and intuitive

**Acceptance Criteria:**
- [x] **AC-US2-01**: Flow: Platform → Owner → Pattern → Select Parent → Done
- [x] **AC-US2-02**: No redundant discovery calls (single discovery phase)
- [ ] **AC-US2-03**: Remote URL format auto-detected or asked once, not per-repo (deferred)

### US-003: Clear Messaging
**As a** user
**I want** clear, accurate messages about what's happening
**So that** I understand the process

**Acceptance Criteria:**
- [x] **AC-US3-01**: Discovery message: "Found N repos matching 'pattern'"
- [x] **AC-US3-02**: Selection message: "Select parent repository (1 of N)"
- [x] **AC-US3-03**: Confirmation: "Parent: X, Implementation repos: Y, Z"

## Out of Scope

- Changes to manual entry flow (working correctly)
- Changes to single-repo flow
- New discovery strategies (all/regex/glob)
