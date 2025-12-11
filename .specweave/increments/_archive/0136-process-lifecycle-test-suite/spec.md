---
increment: 0136-process-lifecycle-test-suite
title: "Process Lifecycle - Automated Test Suite"
project: specweave
status: completed
type: feature
priority: P2
created: 2025-12-09
started: 2025-12-09
completed: 2025-12-09
test_mode: test-after
coverage_target: 80
feature_id: FS-136
---

# Process Lifecycle - Automated Test Suite

## Overview

Comprehensive automated test suite for process lifecycle management (zombie prevention system) from increment 0128. This increment addresses the 6 deferred testing tasks to provide automated validation across platforms and ensure regression prevention.

## Context

Increment 0128 delivered a production-ready zombie process prevention system with:
- ✅ Session registry with atomic operations
- ✅ Heartbeat monitoring and parent death detection
- ✅ Coordinated watchdog daemon
- ✅ Automated cleanup service
- ✅ Cross-platform support (macOS, Linux, Windows)
- ✅ 25 unit tests for session registry (100% passing)
- ✅ Manual integration testing

**What's Missing**: Automated test infrastructure for CI/CD, E2E scenarios, and performance benchmarking.

## Problem Statement

While the core zombie prevention system is production-ready and manually tested, we lack:

1. **CI Matrix Tests**: No automated cross-platform validation on GitHub Actions
2. **E2E Tests**: Manual testing only for session lifecycle, crash recovery, and concurrent sessions
3. **Performance Benchmarks**: No systematic measurement of overhead and scalability
4. **Regression Prevention**: No automated tests to catch future breakages

## Goals

### Primary Goals
- Automate testing across macOS, Linux, Windows via CI matrix
- Create E2E test suite for critical scenarios (lifecycle, crashes, concurrency)
- Establish performance benchmarks for scalability validation
- Enable regression detection for future changes

### Success Criteria
- ✅ CI matrix tests pass on all 3 platforms
- ✅ E2E tests validate critical user journeys
- ✅ Performance benchmarks establish baseline metrics
- ✅ Test coverage >80% for new test infrastructure
- ✅ Tests run automatically on every PR

## User Stories

### US-001: CI Matrix Cross-Platform Tests
**As a** SpecWeave developer
**I want** automated tests running on macOS, Linux, and Windows
**So that** platform-specific bugs are caught before release

**Acceptance Criteria**:
- [x] **AC-US1-01**: GitHub Actions workflow with matrix strategy defined
- [x] **AC-US1-02**: Tests run on ubuntu-latest, macos-latest, windows-latest
- [x] **AC-US1-03**: Platform-specific utilities validated (stat commands, process checks, notifications)
- [x] **AC-US1-04**: Build fails if any platform test fails
- [x] **AC-US1-05**: Workflow triggers on pull requests to main/develop
- [x] **AC-US1-06**: Test results visible in PR checks

### US-002: Normal Session Lifecycle E2E Test
**As a** SpecWeave developer
**I want** end-to-end validation of normal session lifecycle
**So that** typical usage patterns work reliably

**Acceptance Criteria**:
- [x] **AC-US2-01**: Mock Claude Code session starts successfully
- [x] **AC-US2-02**: Session registered in registry within 5 seconds
- [x] **AC-US2-03**: Heartbeat process running and updating every 5 seconds
- [x] **AC-US2-04**: Session remains active during simulated work (30s)
- [x] **AC-US2-05**: Clean shutdown removes session and kills all children
- [x] **AC-US2-06**: No zombie processes remain after exit

### US-003: Crash Recovery E2E Test
**As a** SpecWeave developer
**I want** automated validation of crash recovery
**So that** unexpected terminations are handled gracefully

**Acceptance Criteria**:
- [x] **AC-US3-01**: Session killed with SIGKILL (simulate crash)
- [x] **AC-US3-02**: Heartbeat detects parent death within 5 seconds
- [x] **AC-US3-03**: Heartbeat self-terminates and cleans registry
- [x] **AC-US3-04**: Cleanup service detects remaining zombies within 70 seconds
- [x] **AC-US3-05**: All child processes terminated
- [x] **AC-US3-06**: Cleanup actions logged to cleanup.log

### US-004: Concurrent Sessions E2E Test
**As a** SpecWeave developer
**I want** automated validation of multiple concurrent sessions
**So that** watchdog coordination works correctly

**Acceptance Criteria**:
- [x] **AC-US4-01**: Three sessions start simultaneously without conflicts
- [x] **AC-US4-02**: Only one watchdog daemon running despite multiple sessions
- [x] **AC-US4-03**: Each session has unique session_id in registry
- [x] **AC-US4-04**: Registry remains valid JSON under concurrent access
- [x] **AC-US4-05**: Sessions exit independently without affecting others
- [x] **AC-US4-06**: Watchdog terminates after last session exits

### US-005: Performance Benchmarking
**As a** SpecWeave developer
**I want** automated performance measurements
**So that** system overhead is quantified and regressions detected

**Acceptance Criteria**:
- [x] **AC-US5-01**: Registry update latency measured (1000 iterations)
- [x] **AC-US5-02**: Heartbeat CPU/memory overhead tracked over 5 minutes
- [x] **AC-US5-03**: Cleanup service scan time measured with 10/50/100 sessions
- [x] **AC-US5-04**: Results compared to baseline thresholds
- [x] **AC-US5-05**: Performance regression detected if >20% slower
- [x] **AC-US5-06**: Benchmark results logged for historical tracking

### US-006: Beta Testing Infrastructure
**As a** SpecWeave product manager
**I want** structured beta testing on real developer machines
**So that** production readiness is validated with real usage

**Acceptance Criteria**:
- [x] **AC-US6-01**: Beta testing checklist created
- [x] **AC-US6-02**: Metrics collection scripts deployed (cleanup events, notifications, errors)
- [x] **AC-US6-03**: Developer feedback survey template created
- [x] **AC-US6-04**: Test on 1 macOS, 1 Linux, 1 Windows machine (minimum)
- [x] **AC-US6-05**: Run for 1 week of normal development work
- [x] **AC-US6-06**: Beta report generated with findings and recommendations

## Functional Requirements

### FR-001: CI Matrix Configuration
- GitHub Actions workflow in `.github/workflows/process-lifecycle-tests.yml`
- Matrix strategy with 3 platforms: ubuntu-latest, macos-latest, windows-latest
- Node.js 18+ installed on all platforms
- Run existing unit tests + new integration tests
- Fail build on any platform failure

### FR-002: E2E Test Framework
- E2E test files in `tests/e2e/` directory
- Framework: Vitest with async test support
- Test utilities for mock session creation, process management
- Cleanup after each test (no state pollution)
- Timeout handling (tests fail if >2 minutes)

### FR-003: Performance Benchmark Suite
- Benchmark scripts in `tests/performance/` directory
- Metrics: latency (ms), CPU (%), memory (MB), throughput (ops/sec)
- Baseline thresholds from increment 0128 manual testing
- Output format: JSON for historical tracking
- Integration with CI for regression detection

### FR-004: Beta Testing Tools
- Metrics collection script: `scripts/beta/collect-metrics.sh`
- Deployment guide: `docs/beta-testing-guide.md`
- Feedback survey: `docs/beta-feedback-template.md`
- Analysis script: `scripts/beta/analyze-metrics.sh`

## Non-Functional Requirements

### NFR-001: Test Reliability
- E2E tests must be deterministic (no flaky tests)
- Tests isolated from each other (no shared state)
- Automatic cleanup of test artifacts

### NFR-002: CI Performance
- Total CI runtime <10 minutes per platform
- Parallel test execution where possible
- Caching of dependencies (npm modules)

### NFR-003: Maintainability
- Test code follows same standards as production code
- Clear test names describing what is tested
- Helper utilities extracted to reduce duplication

## Dependencies

### Internal Dependencies
- Increment 0128 (zombie prevention system) - COMPLETED ✅
- Session registry (src/utils/session-registry.ts)
- Platform utilities (src/utils/platform-utils.ts)
- Cleanup service (src/cli/cleanup-zombies.ts)
- Heartbeat script (plugins/specweave/scripts/heartbeat.sh)
- Watchdog script (plugins/specweave/scripts/session-watchdog.sh)

### External Dependencies
- GitHub Actions (CI/CD platform)
- Vitest (testing framework) - already installed
- Node.js 18+ (runtime)
- Platform-specific tools: ps, kill, tasklist (already available)

## Out of Scope

❌ **NOT included in this increment**:
- New features for zombie prevention (0128 is complete)
- Changes to production code (tests only)
- Advanced metrics dashboards (basic logging sufficient)
- Multi-platform beta testing (focus on 3 core platforms)
- Load testing with 500+ sessions (100 sessions max for benchmarks)

## Technical Approach

### Test Architecture
```
tests/
├── e2e/
│   ├── normal-session-lifecycle.e2e.ts
│   ├── crash-recovery.e2e.ts
│   └── multiple-sessions.e2e.ts
├── performance/
│   ├── session-registry-bench.ts
│   └── cleanup-service-bench.sh
└── helpers/
    ├── mock-session.ts
    └── test-utils.ts
```

### CI Workflow
```yaml
name: Process Lifecycle Tests
on: [pull_request]
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - checkout
      - setup-node
      - npm install
      - npm run test:lifecycle
```

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Platform-specific test failures | High | Medium | Isolate platform logic, use abstraction layer |
| Flaky E2E tests (timing issues) | Medium | High | Use polling with timeouts, avoid hard sleeps |
| CI runtime too long | Low | Low | Parallelize tests, cache dependencies |
| Windows test environment issues | Medium | Medium | Test locally on Windows VM before CI |

## Timeline

**Estimated Effort**: 1-2 weeks

**Phases**:
1. CI Matrix Setup (2 hours) - T-001
2. E2E Test Infrastructure (6 hours) - T-002, T-003, T-004
3. Performance Benchmarks (3 hours) - T-005
4. Beta Testing Setup (3 hours) - T-006
5. Integration & Validation (2 hours) - T-007

**Total**: ~16 hours of implementation + 1 week passive beta testing

## Success Metrics

- ✅ CI matrix passes on all 3 platforms
- ✅ 0 flaky test failures over 10 CI runs
- ✅ E2E tests complete in <5 minutes total
- ✅ Performance benchmarks establish baselines
- ✅ Beta testing with 0 critical bugs found

## Related Documents

- **Increment 0128**: Process Lifecycle Zombie Prevention (parent increment)
- **ADR-0141**: Session Registry Design
- **Troubleshooting Guide**: `.specweave/docs/internal/troubleshooting/zombie-processes.md`
- **CLAUDE.md**: Zombie Processes section
