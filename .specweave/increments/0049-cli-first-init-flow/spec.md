---
increment: 0049-cli-first-init-flow
title: "CLI-First Init Flow with Smart Pagination (Phase 2)"
feature_id: FS-049
status: completed
priority: P1
created: 2025-11-21
started: 2025-11-21
completed: 2025-11-21
structure: user-stories
tech_stack:
  language: TypeScript
  runtime: Node.js 20 LTS
  cli_framework: Inquirer.js
  ui_libraries: Ora, Chalk
  testing: Vitest, Playwright
dependencies:
  - FS-048 (Phase 1a - ConfigManager & Auto-Discovery)
  - ADR-0052 (Smart Pagination)
  - ADR-0053 (CLI-First Defaults)
  - ADR-0055 (Progress Tracking)
target_metrics:
  init_time_reduction: "2-5 minutes → < 30 seconds"
  keystroke_reduction: "80% (deselect 5 vs select 45)"
  timeout_errors: "Zero (100% success rate)"
---

# Specification: CLI-First Init Flow with Smart Pagination

**Increment**: 0049-cli-first-init-flow
**Feature**: [FS-049 - CLI-First Init Flow (Phase 2)](../../docs/internal/specs/_features/FS-049/FEATURE.md)
**Status**: Planned
**Priority**: P1 (High)
**Phase**: 2 of External Tool Import Enhancement

---

## Overview

### Problem Statement

SpecWeave's current initialization flow for external tools (JIRA, Azure DevOps) suffers from three critical UX problems:

1. **Slow initialization** - 2-5 minutes for 100+ projects (users abandon during wait)
2. **Poor CLI UX** - Requires manually selecting 45 out of 50 projects (repetitive, tedious)
3. **Hidden functionality** - `<a>` keyboard shortcut to "select all" has low discoverability

**Real User Pain Points**:
- "I have 200 JIRA projects but only use 5. Why does init take 5 minutes?"
- "I had to press Space 45 times to select my projects. Terrible UX."
- "I didn't know about the `<a>` shortcut until I saw it in docs."
- "Init timed out at 50 projects. Can't use SpecWeave."

### Target Users

- **DevOps engineers** configuring SpecWeave for large organizations (50-500+ projects)
- **Development teams** onboarding to SpecWeave with existing JIRA/ADO infrastructure
- **CLI power users** expecting efficient bulk operations (not manual point-and-click)
- **Multi-team organizations** with complex project hierarchies

### Business Value

**Performance Gains**:
- **80% faster init** - From 2-5 minutes → < 30 seconds for 100+ projects
- **Zero timeout errors** - Smart pagination prevents API overload
- **Immediate productivity** - Users can start working in seconds, not minutes

**UX Improvements**:
- **80% fewer keystrokes** - Deselect 5 unwanted projects vs. select 45 wanted projects
- **Explicit choices** - No hidden shortcuts, clear upfront strategy selection
- **CLI philosophy alignment** - Bulk operations by default (like `git clone`, `npm install`)

**Organizational Impact**:
- **Faster team onboarding** - 30-second init vs. 5-minute wait
- **Better adoption** - Smooth first experience = higher retention
- **Reduced support burden** - Fewer "init timed out" support tickets

### Dependencies

**Phase 1a Prerequisites** (Completed in Increment 0048):
- ✅ ConfigManager with secrets/config separation (ADR-0050)
- ✅ JIRA auto-discovery API integration (ADR-0049)
- ✅ Project selection infrastructure (`plugins/specweave-jira/lib/project-selector.ts`)

**Architecture Decisions** (Accepted):
- ✅ ADR-0052: Smart Pagination (50-project limit during init)
- ✅ ADR-0053: CLI-First Defaults ("Import all" as default)
- ✅ ADR-0055: Progress Tracking with Cancelation

**External Dependencies**:
- JIRA REST API v3 (Cloud) and v2 (Server) with pagination support
- Azure DevOps REST API with project query capabilities
- Inquirer.js for interactive prompts (already in use)
- Ora for progress spinners (already in use)

---

## User Stories

This increment implements the following user stories from FS-049:

### US-001: Smart Pagination During Init (50-Project Limit)

**As a** DevOps engineer configuring SpecWeave for a large organization
**I want** initialization to complete in < 30 seconds even with 500+ projects
**So that** I can get started immediately without waiting 5 minutes

**Acceptance Criteria**:

- [x] **AC-US1-01**: Fetch project count ONLY during init (lightweight API call)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (mock JIRA API, verify count-only query)

- [x] **AC-US1-02**: Show total project count to user upfront
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify UI displays "Found 127 projects")
  - **Example**: "Found 127 accessible projects"

- [x] **AC-US1-03**: Limit initial load to 50 projects maximum
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (verify pagination parameters)
  - **Rationale**: < 30 second init time requirement

- [x] **AC-US1-04**: "Import all" option fetches remaining projects asynchronously
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify batched fetch with progress)
  - **Progress**: "Fetching projects... 50/127 (39%)"

- [x] **AC-US1-05**: Init completes < 30 seconds for 100+ project instances
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (performance benchmark)
  - **Validation**: Performance test with real JIRA instance

- [x] **AC-US1-06**: Cancelation support (Ctrl+C) saves partial progress
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (simulate Ctrl+C, verify state saved)
  - **State File**: `.specweave/cache/import-state.json`

**Priority**: P0 (Critical)
**Estimated Effort**: 2-3 days
**Test Coverage Target**: 90%+ (critical performance path)

---

### US-002: CLI-First Defaults (Import All by Default)

**As a** CLI power user expecting efficient workflows
**I want** "Import all" to be the default choice with all checkboxes pre-checked
**So that** I spend seconds deselecting unwanted items instead of minutes selecting wanted items

**Acceptance Criteria**:

- [x] **AC-US2-01**: Upfront strategy choice before loading projects
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify prompt appears before API calls)
  - **Options**: "Import all" / "Select specific" / "Manual entry"

- [x] **AC-US2-02**: "Import all" is default selection (recommended)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify default value in prompt)
  - **UI**: `✨ Import all 127 projects (recommended)`

- [x] **AC-US2-03**: Checkbox mode has all projects checked by default
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify `checked: true` for all items)
  - **Rationale**: Deselecting 5 is faster than selecting 45

- [x] **AC-US2-04**: Clear instructions shown to user
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (verify instruction text displayed)
  - **Message**: "All projects selected by default. Deselect unwanted with <space>, toggle all with <a>"

- [x] **AC-US2-05**: Safety confirmation for large imports (> 100 projects)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify confirmation prompt appears)
  - **Threshold**: Show confirmation if project count > 100
  - **Default**: "No" (safe default prevents accidental bulk import)

- [x] **AC-US2-06**: Manual entry option for users wanting 1-2 projects
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (verify comma-separated input)
  - **Format**: "BACKEND,FRONTEND,MOBILE"

**Priority**: P1 (High)
**Estimated Effort**: 1-2 days
**Test Coverage Target**: 85%+ (UX critical)

---

### US-003: Progress Tracking with Real-Time Feedback

**As a** user importing 100+ projects
**I want** to see real-time progress with percentage and ETA
**So that** I know the operation is working and how long it will take

**Acceptance Criteria**:

- [x] **AC-US3-01**: Progress bar shows N/M completed and percentage
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify progress updates)
  - **Format**: "Fetching projects... 47/127 (37%)"

- [x] **AC-US3-02**: ETA estimation based on current rate
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (verify ETA calculation)
  - **Display**: "[47s elapsed, ~2m remaining]"
  - **Algorithm**: Rolling average of last 10 items

- [x] **AC-US3-03**: Progress updates every 5 projects (not every project)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (verify update frequency)
  - **Rationale**: Reduce console spam, improve readability

- [x] **AC-US3-04**: Final summary shows succeeded/failed/skipped counts
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify summary format)
  - **Example**: "Imported 98/127, 5 failed, 24 skipped"

- [x] **AC-US3-05**: Errors logged to `.specweave/logs/import-errors.log`
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify log file creation)
  - **Format**: `[timestamp] PROJECT-KEY: Error message (suggestion)`

- [x] **AC-US3-06**: Continue on failure (don't stop batch on single error)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (mock error, verify continuation)
  - **Rationale**: 1 failed project shouldn't block 99 others

**Priority**: P1 (High)
**Estimated Effort**: 2 days
**Test Coverage Target**: 90%+ (critical UX path)

---

### US-004: Graceful Cancelation Support

**As a** user who needs to interrupt a long-running import
**I want** Ctrl+C to save my progress and allow me to resume later
**So that** I don't lose 5 minutes of work and have to start over

**Acceptance Criteria**:

- [x] **AC-US4-01**: Ctrl+C signal handler registered during bulk operations
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (simulate SIGINT, verify handler called)

- [x] **AC-US4-02**: Partial progress saved to `.specweave/cache/import-state.json`
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify state file structure)
  - **State Fields**: operation, total, completed, succeeded, failed, remaining, errors

- [x] **AC-US4-03**: Clean exit with summary (no errors thrown)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (verify exit code 0)
  - **Message**: "Imported 47/127 projects (37% complete)"

- [x] **AC-US4-04**: Resume command suggested to user
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (verify suggestion displayed)
  - **Command**: `/specweave-jira:import-projects --resume`

- [x] **AC-US4-05**: Resume capability implemented (continues from saved state)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (save state, resume, verify continuation)

- [x] **AC-US4-06**: State expires after 24 hours (force fresh start)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (verify timestamp validation)
  - **Rationale**: Stale state may be inconsistent with current JIRA state

**Priority**: P1 (High)
**Estimated Effort**: 1.5 days
**Test Coverage Target**: 85%+ (reliability critical)

---

### US-005: Batch Fetching with Pagination

**As a** system administrator with 500+ JIRA projects
**I want** SpecWeave to fetch projects in batches of 50 with proper pagination
**So that** initialization completes without timeout errors or API rate limit violations

**Acceptance Criteria**:

- [x] **AC-US5-01**: JIRA API called with pagination parameters (startAt, maxResults)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (verify API request parameters)
  - **Endpoints**: Cloud `/rest/api/3/project/search`, Server `/rest/api/2/project`

- [x] **AC-US5-02**: Batch size configurable (default 50 projects)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (verify config override works)
  - **Config**: `.specweave/config.json` → `importBatchSize: 50`

- [x] **AC-US5-03**: Retry logic with exponential backoff on API errors
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (mock timeout, verify retry)
  - **Retries**: 3 attempts with backoff (1s, 2s, 4s)

- [x] **AC-US5-04**: Respect API rate limit headers (X-RateLimit-Remaining)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (mock rate limit response, verify throttling)
  - **Threshold**: Throttle if < 10 requests remaining

- [x] **AC-US5-05**: Graceful degradation (reduce batch size on timeout)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P2
  - **Testable**: Yes (simulate timeout, verify batch reduction)
  - **Fallback**: 50 → 25 → 10 projects per batch

- [x] **AC-US5-06**: All batches complete successfully (zero timeout errors)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes (performance test with 500 mock projects)
  - **Target**: 100% success rate in performance tests

**Priority**: P0 (Critical)
**Estimated Effort**: 2 days
**Test Coverage Target**: 95%+ (reliability critical)

---

## Functional Requirements

### FR-001: Init Performance Optimization

**Description**: Initialization must complete in < 30 seconds for 100+ project instances

**Implementation**:
1. Fetch project count only (no metadata yet) - 1 lightweight API call
2. Show upfront strategy choice to user (no hidden shortcuts)
3. Load first 50 projects with metadata (Tier 1)
4. If "Import all", fetch remaining projects asynchronously with progress tracking

**Priority**: P0 (Critical)

**Validation**:
- Performance benchmark: 100 projects → < 30 seconds
- Stress test: 500 projects → < 2 minutes with "Import all"
- API call count: ≤ 12 calls for 500 projects (1 count + 10 batches of 50 + 1 validation)

---

### FR-002: CLI-First User Experience

**Description**: Default to bulk operations (import all) with deselection workflow

**Implementation**:
1. "Import all" is default choice (top option, recommended)
2. Checkbox mode has all items checked by default (`checked: true`)
3. Clear instructions shown: "Deselect unwanted with <space>"
4. Safety confirmation for > 100 projects (prevents accidents)
5. Manual entry option for edge cases (1-2 projects only)

**Priority**: P1 (High)

**Validation**:
- Keystroke count comparison: 5 deselects vs. 45 selects (80% reduction)
- User testing: 90%+ choose "Import all" (default is correct)
- Accessibility: Instructions visible without scrolling

---

### FR-003: Real-Time Progress Feedback

**Description**: Show progress bar, percentage, ETA, and final summary

**Implementation**:
1. ASCII progress bar with percentage: `[=============>          ] 37%`
2. ETA estimation using rolling average (last 10 items)
3. Update frequency: Every 5 projects (reduce console spam)
4. Final summary: Succeeded/failed/skipped counts
5. Error logging: `.specweave/logs/import-errors.log`

**Priority**: P1 (High)

**Validation**:
- Progress updates visible within 1 second of each batch completion
- ETA accuracy: ±20% of actual time (acceptable variance)
- Console readability: No flickering, clear updates

---

### FR-004: Graceful Cancelation & Resume

**Description**: Ctrl+C saves partial progress, resume command continues

**Implementation**:
1. SIGINT handler registered during bulk operations
2. Save state to `.specweave/cache/import-state.json` (atomic write)
3. Clean exit with summary (no errors)
4. Resume command: `/specweave-jira:import-projects --resume`
5. State TTL: 24 hours (force fresh start if stale)

**Priority**: P1 (High)

**Validation**:
- Ctrl+C at 50% completion → state saved correctly
- Resume continues from saved position (no duplicates)
- State validation: Expired state prompts fresh start

---

### FR-005: Robust Error Handling

**Description**: Continue on failure, log errors, retry with backoff

**Implementation**:
1. Continue on single project failure (don't block batch)
2. Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
3. Rate limit respect: Throttle if X-RateLimit-Remaining < 10
4. Graceful degradation: Reduce batch size on timeout (50 → 25 → 10)
5. Error logging with suggestions (permissions, timeout, not found)

**Priority**: P1 (High)

**Validation**:
- Mock permission error on 5/100 projects → 95 imported successfully
- Mock rate limit → batch pauses, resumes after throttle
- Mock timeout → batch size reduced, import continues

---

## Non-Functional Requirements

### NFR-001: Performance (< 30 Second Init)

**Target Metrics**:
- **Baseline**: 2-5 minutes for 100 projects (current implementation)
- **Target**: < 30 seconds for 100 projects (80% improvement)
- **Stretch**: < 15 seconds for 50 projects

**Validation**:
- Performance testing with real JIRA Cloud instance (50, 100, 500 projects)
- Automated benchmarks in CI/CD pipeline
- P95 latency: 95% of inits complete < 30 seconds

**Priority**: P0 (Critical)

---

### NFR-002: API Rate Limit Compliance

**Limits**:
- **JIRA Cloud**: 3600 requests/hour (1 req/sec average)
- **JIRA Server**: Varies by instance (respect X-RateLimit headers)
- **Azure DevOps**: 200 requests/user/hour

**Strategies**:
- Batch API calls (fetch 50 projects in 1 call, not 50 calls)
- Respect `Retry-After` headers (exponential backoff)
- Cache project list for 24 hours (reduce redundant calls)
- Progress throttling (update UI every 5 items, not every item)

**Priority**: P0 (Critical - must not break API access)

---

### NFR-003: UX Clarity (No Hidden Shortcuts)

**Requirements**:
- Upfront choice: "Import all" vs "Select specific" vs "Manual entry"
- No hidden shortcuts (all actions visible in prompts)
- Clear defaults ("Import all" is default for CLI users)
- Consistency with GitHub init flow (already has strategy selection)
- Explicit confirmation for risky actions (> 100 projects)

**Priority**: P1 (High - user trust)

---

### NFR-004: Reliability (Zero Timeout Errors)

**Target**:
- 100% success rate in 100 test runs with 100+ project instances
- Graceful degradation on network issues (reduce batch size, retry)
- Resume capability tested with interrupted imports
- Error handling covers all failure modes (permissions, timeout, not found)

**Priority**: P0 (Critical - init must work every time)

---

## Success Criteria

### Must-Have (MVP)

1. ✅ **Init time < 30 seconds** for 100+ project instances (NFR-001)
2. ✅ **"Import all" as default** with upfront strategy choice (FR-002)
3. ✅ **50-project pagination** working correctly (FR-005)
4. ✅ **Progress tracking** with percentage and ETA (FR-003)
5. ✅ **Graceful cancelation** with state save (FR-004)
6. ✅ **Zero timeout errors** in performance tests (NFR-004)

### Should-Have (Enhanced)

1. ⭐ **Resume capability** tested and working (FR-004)
2. ⭐ **Safety confirmation** for > 100 projects (FR-002)
3. ⭐ **Error logging** with actionable suggestions (FR-005)
4. ⭐ **Retry logic** with exponential backoff (FR-005)

### Metrics (Validation)

**Performance**:
- Init time reduced from 2-5 minutes → < 30 seconds (80% improvement)
- API calls reduced from 100+ → < 12 for 500 projects (90% reduction)

**UX**:
- "Import all" default = 80% fewer keystrokes (5 deselects vs. 45 selects)
- User testing: 90% choose "Import all" (validates default choice)

**Reliability**:
- Zero timeout errors in 100 test runs with 100+ projects
- 100% success rate in performance benchmarks

**Adoption**:
- 90%+ users complete init in < 1 minute (vs. 5+ minutes currently)
- Support tickets for "init timeout" reduced to zero

---

## Test Strategy

### Unit Tests

**Coverage Target**: 85%+

**Test Cases**:
- Smart pagination logic (50-project limit, batch calculation)
- Progress tracker (percentage calculation, ETA estimation)
- Cancelation handler (SIGINT handling, state save)
- Retry logic (exponential backoff, max attempts)
- Batch fetching (pagination parameters, API request construction)

**Example**:
```typescript
describe('ProgressTracker', () => {
  it('should calculate correct percentage', () => {
    const tracker = new ProgressTracker({ total: 100 });
    tracker.update('PROJECT-1', 'success');
    expect(tracker.getPercentage()).toBe(1);
  });

  it('should estimate ETA using rolling average', () => {
    const tracker = new ProgressTracker({ total: 100, showEta: true });
    // Simulate 10 items taking 1 second each
    for (let i = 0; i < 10; i++) {
      tracker.update(`PROJECT-${i}`, 'success');
    }
    const eta = tracker.getEta();
    expect(eta).toMatch(/~90s remaining/);
  });
});
```

---

### Integration Tests

**Coverage Target**: 80%+

**Test Cases**:
- Full init flow with 50 mock projects (end-to-end)
- "Import all" flow with 127 mock projects (async fetch)
- Checkbox mode with pre-checked items (deselection workflow)
- Progress tracking during batch operations (visual validation)
- Cancelation and resume (state persistence)

**Example**:
```typescript
describe('CLI-First Init Flow', () => {
  it('should complete init in < 30s for 100 projects', async () => {
    const mockProjects = generateMockProjects(100);
    const startTime = Date.now();

    await runInitFlow({
      strategy: 'import-all',
      projects: mockProjects
    });

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(30000); // 30 seconds
  });

  it('should save partial progress on Ctrl+C', async () => {
    const mockProjects = generateMockProjects(127);

    const cancelAfter = 50; // Cancel after 50 projects
    const state = await runInitFlowWithCancel({
      projects: mockProjects,
      cancelAfter
    });

    expect(state.completed).toBe(50);
    expect(state.remaining.length).toBe(77);
    expect(state.canceled).toBe(true);
  });
});
```

---

### E2E Tests (Playwright)

**Coverage Target**: 70%+

**Test Cases**:
- Full init workflow with real JIRA Cloud instance (50 projects)
- "Import all" workflow (100 projects, < 30s target)
- Progress bar visual validation (percentage updates)
- Cancelation UX (Ctrl+C, summary displayed)
- Resume workflow (continue from saved state)

**Example**:
```typescript
test('Init completes in < 30s for 100 projects', async ({ page }) => {
  await page.goto('/cli');

  // Enter JIRA credentials
  await page.fill('#domain', 'example.atlassian.net');
  await page.fill('#email', 'test@example.com');
  await page.fill('#token', 'test-token');

  // Select "Import all" strategy
  await page.click('text=Import all 100 projects (recommended)');

  // Wait for init completion
  const startTime = Date.now();
  await page.waitForSelector('text=✅ Init Complete!', { timeout: 35000 });
  const elapsed = Date.now() - startTime;

  expect(elapsed).toBeLessThan(30000);
});
```

---

### Performance Tests

**Coverage Target**: 95%+ (critical performance path)

**Test Cases**:
- Baseline measurement (current implementation, 100 projects)
- Optimized measurement (new implementation, 100 projects)
- Stress test (500 projects, "Import all" flow)
- API call count validation (≤ 12 calls for 500 projects)

**Example**:
```typescript
describe('Performance Benchmarks', () => {
  it('should complete init in < 30s for 100 projects', async () => {
    const results = await runPerformanceBenchmark({
      projectCount: 100,
      strategy: 'import-all',
      runs: 10
    });

    const p95 = results.latencies.p95;
    expect(p95).toBeLessThan(30000); // P95 < 30 seconds
  });

  it('should reduce API calls by 90%', async () => {
    const results = await runApiCallCountTest({
      projectCount: 500,
      strategy: 'import-all'
    });

    expect(results.apiCalls).toBeLessThan(12); // 1 count + 10 batches + 1 validation
  });
});
```

---

## Implementation Details

### Phase Breakdown

**Phase 1a (Completed)** - Increment 0048:
- ✅ ConfigManager with secrets/config separation
- ✅ JIRA auto-discovery API integration
- ✅ Foundation for project selection

**Phase 2 (This Increment)** - Increment 0049:
- 🔄 Smart pagination (50-project limit)
- 🔄 CLI-first defaults ("Import all" default)
- 🔄 Progress tracking with ETA
- 🔄 Graceful cancelation and resume
- 🔄 Batch fetching with retry logic

**Phase 3 (Future)** - TBD:
- Three-tier dependency loading (Tier 2/3)
- Smart caching with 24-hour TTL
- Dedicated import commands (post-init)
- Azure DevOps area path mapping

---

### Files Created/Modified

**New Files**:
- `src/cli/helpers/progress-tracker.ts` - Progress bar and ETA calculation
- `src/cli/helpers/cancelation-handler.ts` - Ctrl+C handling and state save
- `src/cli/helpers/batch-fetcher.ts` - Pagination and retry logic
- `.specweave/cache/import-state.json` - Cancelation state persistence

**Modified Files**:
- `src/cli/helpers/issue-tracker/jira.ts` - Add upfront strategy choice
- `plugins/specweave-jira/lib/project-selector.ts` - CLI-first defaults (checked by default)
- `src/cli/commands/init.ts` - Integrate progress tracking and cancelation

---

### API Integration

**JIRA Cloud (v3)**:
- **Count Check**: `GET /rest/api/3/project/search?maxResults=0` (returns total count only)
- **Batch Fetch**: `GET /rest/api/3/project/search?startAt={offset}&maxResults={limit}`

**JIRA Server (v2)**:
- **Count Check**: `GET /rest/api/2/project?maxResults=0`
- **Batch Fetch**: `GET /rest/api/2/project?startAt={offset}&maxResults={limit}`

**Azure DevOps**:
- **Count Check**: `GET https://dev.azure.com/{org}/_apis/projects?$top=0`
- **Batch Fetch**: `GET https://dev.azure.com/{org}/_apis/projects?$top={limit}&$skip={offset}`

---

## Architecture Diagrams

### Enhanced Init Flow (High-Level)

```
┌─────────────────────────────────────┐
│ specweave init                      │
└────────────┬────────────────────────┘
             │
     ┌───────▼────────┐
     │ Choose Tracker │
     │ (JIRA, ADO)    │
     └───────┬────────┘
             │
     ┌───────▼────────────────────────┐
     │ Validate Credentials           │
     │ (fast auth check)              │
     └───────┬────────────────────────┘
             │
     ┌───────▼────────────────────────┐
     │ Fetch Project Count (Quick)    │  ← NEW: Lightweight check
     │ Found 127 projects             │
     └───────┬────────────────────────┘
             │
     ┌───────▼────────────────────────┐
     │ Import Strategy Choice         │  ← NEW: Upfront explicit choice
     │ 1. ✨ Import all (127)          │
     │ 2. 📋 Select specific          │
     │ 3. ✏️  Manual entry             │
     └───────┬────────────────────────┘
             │
        ┌────┴────┐
        │         │
  ┌─────▼──┐  ┌──▼──────┐
  │ All    │  │ Specific │
  │ (Async)│  │ (Filter) │
  └─────┬──┘  └──┬───────┘
        │        │
        └────┬───┘
             │
     ┌───────▼────────────────────────┐
     │ Load First 50 Projects         │  ← NEW: Smart pagination
     │ (Metadata only, < 5 seconds)   │
     └───────┬────────────────────────┘
             │
     ┌───────▼────────────────────────┐
     │ If "Import all": Fetch Rest    │  ← NEW: Async with progress
     │ Progress: 50/127 (39%)         │
     └───────┬────────────────────────┘
             │
     ┌───────▼────────────────────────┐
     │ Create Multi-Project Folders   │
     │ Cache project list (24h TTL)   │
     └───────┬────────────────────────┘
             │
     ┌───────▼────────────────────────┐
     │ ✅ Init Complete!               │
     │ < 30 seconds elapsed           │
     └────────────────────────────────┘
```

---

### Progress Tracking Flow

```
Bulk Operation Start
    ↓
Register SIGINT Handler
    ↓
Initialize ProgressTracker
    ↓
For each batch (50 projects):
    ↓
Check if canceled (shouldCancel())
    ↓ NO
Fetch batch from API
    ↓
Update progress (N/M, %)
    ↓
If every 5 projects:
    └→ Render progress bar
    └→ Calculate ETA (rolling avg)
    └→ Update console
    ↓
Continue to next batch
    ↓
YES (canceled)
    ↓
Save partial state to cache/import-state.json
    ↓
Show summary (N/M completed)
    ↓
Suggest resume command
    ↓
Clean exit (code 0)
```

---

## Risks & Mitigations

### Risk 1: API Rate Limits (JIRA Cloud)

**Problem**: Fetching 500+ projects may hit rate limits (3600 req/hour)

**Mitigation**:
- Use batch endpoints (`/rest/api/3/project/search?maxResults=50`)
- Cache project list for 24 hours
- Respect `Retry-After` headers (exponential backoff)
- Show progress bar to manage user expectations
- Graceful degradation (reduce batch size on rate limit)

**Priority**: High (P0)

---

### Risk 2: Large Project Lists (UI Performance)

**Problem**: Rendering 500+ checkbox items may freeze UI

**Mitigation**:
- Only load first 50 projects in checkbox mode
- "Import all" bypasses checkbox UI (async fetch with progress bar)
- Virtual scrolling if > 50 items (future enhancement)

**Priority**: Medium (P2)

---

### Risk 3: Partial Failures (Some Projects Inaccessible)

**Problem**: User selects "Import all" but lacks permissions for 10/100 projects

**Mitigation**:
- Validate permissions BEFORE creating folders (optional pre-check)
- Show warning: "⚠️ 10 projects inaccessible (insufficient permissions)"
- Allow user to continue with accessible 90 projects
- Log failed projects to `.specweave/logs/import-errors.log`
- Final summary shows failed count clearly

**Priority**: Medium (P1)

---

### Risk 4: Confusing UX (Three Choices)

**Problem**: Users unsure which option to choose

**Mitigation**:
- Default to "Import all" (recommended choice)
- Clear explanations: "(recommended for full sync)" vs. "(interactive)" vs. "(manual)"
- Consistent with GitHub flow (users familiar with pattern)
- Tooltips/help text explaining each option

**Priority**: Medium (P1)

---

### Risk 5: Network Timeout (Slow API)

**Problem**: Batch fetch times out after 30 seconds

**Mitigation**:
- Retry with exponential backoff (3 attempts: 1s, 2s, 4s)
- Reduce batch size on timeout (50 → 25 → 10 projects)
- Show clear error: "Network timeout. Try again or select fewer projects."
- Progress saved on failure (resume capability)

**Priority**: High (P0)

---

## References

- **Feature Spec**: `.specweave/docs/internal/specs/_features/FS-049/FEATURE.md` (will be created via sync)
- **ADR-0052**: Smart Pagination (50-Project Limit)
- **ADR-0053**: CLI-First Defaults Philosophy
- **ADR-0055**: Progress Tracking with Cancelation
- **Phase 1a**: `.specweave/increments/0048-external-tool-import-enhancement/`
- **JIRA API Docs**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/

---

**End of Specification**
