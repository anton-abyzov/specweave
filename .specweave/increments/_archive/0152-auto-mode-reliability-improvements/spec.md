---
increment: 0152-auto-mode-reliability-improvements
title: "Auto Mode Reliability Improvements for Long-Running Sessions"
status: active
priority: critical
created: 2026-01-02
---

# Auto Mode Reliability Improvements

## Overview

Enhance SpecWeave's auto mode to reliably run for hours without failures. Address 7 critical issues identified in the current implementation that cause failures during long-running autonomous sessions.

## Problem Statement

Current auto mode fails in many scenarios:
1. **Context limits** - No automatic compaction strategy
2. **No heartbeat/watchdog** - Zombie sessions go undetected
3. **Bash-based stop hook fragility** - 860 lines of bash with fragile regex parsing
4. **No task-level checkpoints** - Progress lost on crash
5. **Primitive test failure handling** - 3 retries, no intelligent classification
6. **Missing framework support** - Xcode/iOS tests not supported
7. **No graceful degradation** - Binary success/fail, no partial completion

## User Stories

### US-001: Context-Aware Auto Mode
**Project**: specweave
**As a** developer running auto mode for hours, I want the system to automatically manage context size so that sessions don't fail due to context overflow.

#### Acceptance Criteria
- [x] **AC-US1-01**: Stop hook detects when context is approaching limits (>150k tokens estimated)
- [x] **AC-US1-02**: Auto mode triggers `/compact` command when context threshold exceeded
- [x] **AC-US1-03**: Session state preserved across compaction via checkpoint files
- [x] **AC-US1-04**: Context size estimation based on transcript file size (rough heuristic)

### US-002: Watchdog Mechanism
**Project**: specweave
**As a** developer, I want a watchdog that detects zombie sessions so that I'm alerted when auto mode hangs without crashing.

#### Acceptance Criteria
- [x] **AC-US2-01**: Heartbeat file updated every 30 seconds during active work
- [x] **AC-US2-02**: Watchdog detects sessions with no heartbeat for >5 minutes
- [x] **AC-US2-03**: Watchdog logs warning and can trigger recovery
- [x] **AC-US2-04**: Session registry tracks heartbeat timestamps

### US-003: Xcode/iOS Test Support
**Project**: specweave
**As a** iOS developer, I want auto mode to correctly parse Xcode test results so that my iOS projects work with autonomous execution.

#### Acceptance Criteria
- [x] **AC-US3-01**: Parse `xcodebuild test` output format ("Executed X tests, with Y failures")
- [x] **AC-US3-02**: Detect Xcode build failures vs test failures (different handling)
- [x] **AC-US3-03**: Extract failure details from Xcode output (file, line, error message)
- [x] **AC-US3-04**: Support Swift Package Manager test format (`swift test`)

### US-004: Intelligent Failure Classification
**Project**: specweave
**As a** developer, I want auto mode to intelligently classify test failures so that transient errors are retried immediately while structural errors get proper analysis.

#### Acceptance Criteria
- [x] **AC-US4-01**: Classify failures into: transient, fixable, structural, external, unfixable
- [x] **AC-US4-02**: Transient failures (network, timing) retry immediately without code changes
- [x] **AC-US4-03**: Fixable failures trigger AI analysis and code fix attempt
- [x] **AC-US4-04**: External failures (env/config) pause and alert user
- [x] **AC-US4-05**: Unfixable failures are logged and skipped with user notification

### US-005: Command Timeout Handling
**Project**: specweave
**As a** developer, I want auto mode to timeout long-running commands so that hung processes don't block the entire session.

#### Acceptance Criteria
- [x] **AC-US5-01**: Default timeout of 10 minutes for test commands
- [x] **AC-US5-02**: Configurable timeout per command type in config.json
- [x] **AC-US5-03**: Graceful termination with SIGTERM, then SIGKILL after 30s
- [x] **AC-US5-04**: Timeout events logged with command context

### US-006: Task-Level Checkpoints
**Project**: specweave
**As a** developer, I want auto mode to checkpoint progress at task level so that crashes don't lose work within a task.

#### Acceptance Criteria
- [x] **AC-US6-01**: Checkpoint file created before starting each task
- [x] **AC-US6-02**: Checkpoint includes: current task, files modified, tests run
- [x] **AC-US6-03**: Resume from checkpoint detects partial completion
- [x] **AC-US6-04**: Checkpoint cleanup on successful task completion

### US-007: Generic Test Framework Detection
**Project**: specweave
**As a** developer using any test framework, I want auto mode to detect test results generically so that it works with any framework, not just specific ones.

#### Acceptance Criteria
- [x] **AC-US7-01**: Generic exit code detection (non-zero = failure)
- [x] **AC-US7-02**: Universal failure patterns: FAIL, ERROR, FAILED, failed
- [x] **AC-US7-03**: Framework auto-detection based on config files and output patterns
- [x] **AC-US7-04**: Fallback to exit code when framework not recognized

### US-008: E2E Tests for Auto Mode
**Project**: specweave
**As a** maintainer, I want comprehensive E2E tests for auto mode so that reliability improvements don't regress.

#### Acceptance Criteria
- [x] **AC-US8-01**: E2E test for context management (simulate large context)
- [x] **AC-US8-02**: E2E test for watchdog mechanism
- [x] **AC-US8-03**: E2E test for Xcode test parsing
- [x] **AC-US8-04**: E2E test for failure classification
- [x] **AC-US8-05**: E2E test for command timeout
- [x] **AC-US8-06**: E2E test for task checkpoints
- [x] **AC-US8-07**: E2E test for generic framework detection

## Technical Approach

### Context Management
- Estimate context size from transcript file size (~4 chars/token)
- Trigger compaction at 150k tokens (~600KB transcript)
- Save checkpoint before compaction, resume after

### Watchdog
- Write heartbeat timestamp to `.specweave/state/heartbeat.json`
- Check heartbeat age in stop hook
- External watchdog script for background monitoring (optional)

### Test Framework Support
- Add Xcode parsing to `parse_test_results()` in stop-auto.sh
- Add Swift Package Manager parsing
- Generic fallback using exit codes

### Failure Classification
- Pattern matching for transient errors (network, timeout)
- Pattern matching for structural errors (import, syntax)
- AI-based classification for ambiguous cases

## Out of Scope
- Full process supervision daemon (too complex for this increment)
- Multi-machine distributed auto mode
- Custom test reporter plugins

## Dependencies
- Existing stop-auto.sh implementation
- Session state manager
- Claude Code's `/compact` command
