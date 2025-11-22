---
increment: 0050-external-tool-import-phase-1b-7
title: "Enhanced External Tool Import - Phase 1b-7"
feature_id: FS-048
status: completed
priority: P1
user_stories:
  - US-001
  - US-002
  - US-004
  - US-005
  - US-006
  - US-007
  - US-008
created: 2025-11-21
started: 2025-11-21
dependencies:
  - 0048-external-tool-import-enhancement
structure: user-stories
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "nodejs-cli"
  testing: "vitest"
platform: "npm-global"
---

# Specification: Enhanced External Tool Import - Phase 1b-7

**Increment**: 0050-external-tool-import-phase-1b-7
**Feature**: [FS-048 - Enhanced External Tool Import](../../docs/internal/specs/_features/FS-048/FEATURE.md)
**Status**: ✅ Completed (2025-11-22)
**Priority**: P1 (High)
**Dependencies**: Increment 0048 (Phase 1a - ConfigManager & Jira Auto-Discovery) ✅ Complete

---

## Living Documentation (Source of Truth)

**Complete specifications are maintained in living documentation**:

### Feature Overview
- `.specweave/docs/internal/specs/_features/FS-048/FEATURE.md` (master overview, 679 lines)

### User Stories (7 in This Increment)
- **US-001**: Smart Pagination During Init (P0) - 5 ACs
- **US-002**: CLI-First Defaults (P1) - 4 ACs
- **US-004**: Smart Caching with TTL (P1) - 5 ACs
- **US-005**: Dedicated Import Commands (P2) - 7 ACs
- **US-006**: ADO Area Path Mapping (P2) - 6 ACs
- **US-007**: Progress Tracking (P1) - 6 ACs
- **US-008**: Smart Filtering (P2) - 6 ACs

See individual user story files in `.specweave/docs/internal/specs/specweave/FS-048/` for complete details.

---

## Implementation Summary

**Phase 1a (0048)** ✅ Complete: ConfigManager, Jira auto-discovery, secrets separation

**Phase 1b-7 (THIS INCREMENT)** ⏳ Planned:
- Smart pagination (50-project limit, <30s init)
- CLI-first defaults (select all by default)
- Three-tier dependency loading (Tiers 2-3)
- Smart caching (24-hour TTL)
- Progress tracking (ETA, cancel/resume)
- ADO area path mapping
- Dedicated import commands
- Smart filtering

**Performance Targets**:
- Init time: < 30 seconds (100+ projects)
- API reduction: 90% (200-350 → 1 call during init)
- Cache hit rate: > 90%
- Zero timeout errors

**See**: [plan.md](./plan.md) for complete technical implementation, [tasks.md](./tasks.md) for 72 implementation tasks with embedded tests.

---

## Acceptance Criteria

### US-001: Smart Pagination During Init

- [x] **AC-US1-01**: 50-Project Limit During Init
- [x] **AC-US1-02**: Explicit Choice Prompt
- [x] **AC-US1-03**: Async Fetch for "Import All"
- [x] **AC-US1-04**: Init Completes < 30 Seconds
- [x] **AC-US1-05**: No Timeout Errors

### US-002: CLI-First Defaults

- [x] **AC-US2-01**: "Import All" as Default Choice
- [x] **AC-US2-02**: All Projects Checked in Checkbox Mode
- [x] **AC-US2-03**: Clear Deselection Instructions
- [x] **AC-US2-04**: Easy Override for "Select None"

### US-004: Smart Caching with TTL

- [x] **AC-US4-01**: 24-Hour TTL for Project List
- [x] **AC-US4-02**: Per-Project Dependency Cache
- [x] **AC-US4-03**: Cache Validation on Startup
- [x] **AC-US4-04**: Manual Refresh Command
- [x] **AC-US4-05**: Respect API Rate Limits

### US-005: Dedicated Import Commands

- [x] **AC-US5-01**: `/specweave-jira:import-projects` Command
- [x] **AC-US5-02**: `/specweave-ado:import-projects` Command
- [x] **AC-US5-03**: Merge with Existing Projects (No Duplicates)
- [x] **AC-US5-04**: Smart Filtering (Active Only, By Type, Custom JQL)
- [x] **AC-US5-05**: Resume Support (Interrupted Imports)
- [x] **AC-US5-06**: Progress Tracking with Cancelation
- [x] **AC-US5-07**: Dry-Run Mode (Preview)

### US-006: ADO Area Path Mapping

- [x] **AC-US6-01**: Area Path Discovery
- [x] **AC-US6-02**: Granularity Selection
- [x] **AC-US6-03**: Top-Level Mapping
- [x] **AC-US6-04**: Two-Level Mapping
- [x] **AC-US6-05**: Full Tree Mapping
- [x] **AC-US6-06**: Bidirectional Sync (ADO ↔ SpecWeave)

### US-007: Progress Tracking

- [x] **AC-US7-01**: Real-Time Progress Bar
- [x] **AC-US7-02**: Project-Level Status
- [x] **AC-US7-03**: Elapsed Time Tracking
- [x] **AC-US7-04**: Cancelation Support (Ctrl+C)
- [x] **AC-US7-05**: Error Handling (Continue on Failure)
- [x] **AC-US7-06**: Final Summary Report

### US-008: Smart Filtering

- [x] **AC-US8-01**: Active Projects Filter
- [x] **AC-US8-02**: Project Type Filter
- [x] **AC-US8-03**: Project Lead Filter
- [x] **AC-US8-04**: Custom JQL Filter (JIRA-Specific)
- [x] **AC-US8-05**: Filter Preview (Before Import)
- [x] **AC-US8-06**: Saved Filter Presets
