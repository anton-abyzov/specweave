---
increment: 0150-auto-mode-world-class-testing
title: "Auto Mode World-Class Testing & Intelligent Chunking"
status: active
priority: P0
type: feature
created: 2025-12-30
---

# Auto Mode World-Class Testing & Intelligent Chunking

## Problem Statement

Current `/sw:auto` has critical gaps that prevent it from delivering world-class quality:

1. **No Intelligent Chunking**: When user provides big prompt, auto doesn't split into proper increments
2. **Weak Test Result Parsing**: Stop hook checks if tests RAN, not if they PASSED
3. **No Self-Healing Loop**: When tests fail, no retry mechanism with fix prompts
4. **No E2E Coverage Tracking**: Routes, buttons, viewports not tracked
5. **Claims Success Despite Failures**: "158 tests passing" when 3 are actually failing

## Goals

- **Intelligent Chunking**: Big prompts auto-split into right-sized increments (5-15 tasks each)
- **Strict Test Verification**: Parse actual test RESULTS, not just execution
- **Self-Healing Loop**: 3 retry attempts with specific fix prompts before human gate
- **E2E Coverage Manifest**: Track routes, buttons, viewports tested
- **World-Class UI/UX**: Every route, every button, every viewport, accessibility

## User Stories

### US-001: Intelligent Prompt Chunking
**Project**: specweave
**As a** developer using `/sw:auto "big feature description"`
**I want** auto mode to analyze the scope and create multiple right-sized increments
**So that** I get proper planning before execution starts

**Acceptance Criteria**:
- [x] **AC-US1-01**: When prompt describes 3+ features, auto creates separate increments
- [x] **AC-US1-02**: Each increment is 5-15 tasks (sweet spot)
- [x] **AC-US1-03**: Dependencies between increments are identified
- [x] **AC-US1-04**: User is shown increment plan before execution starts
- [x] **AC-US1-05**: User can approve/modify plan before auto continues

### US-002: Test Result Parsing (Not Just Execution)
**Project**: specweave
**As a** developer in auto mode
**I want** the stop hook to verify tests actually PASSED
**So that** auto mode doesn't claim success when tests are failing

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Stop hook parses test output for FAIL/ERROR patterns
- [ ] **AC-US2-02**: Stop hook extracts specific failing test name and error message
- [ ] **AC-US2-03**: Stop hook blocks completion if ANY test is failing
- [ ] **AC-US2-04**: Stop hook reports accurate pass/fail counts
- [ ] **AC-US2-05**: Works for: npm test, vitest, jest, playwright, pytest, go test

### US-003: Self-Healing Test Loop
**Project**: specweave
**As a** developer in auto mode
**I want** failing tests to trigger automatic fix-and-retry
**So that** transient failures are resolved without human intervention

**Acceptance Criteria**:
- [ ] **AC-US3-01**: On test failure, stop hook increments retry counter
- [ ] **AC-US3-02**: Retry prompt includes specific error message and file:line
- [ ] **AC-US3-03**: Max 3 retry attempts before escalating to human gate
- [ ] **AC-US3-04**: Each retry is logged with failure details
- [ ] **AC-US3-05**: After 3 failures, session pauses for human review
- [ ] **AC-US3-06**: Retry counter resets when moving to next task

### US-004: E2E Coverage Manifest
**Project**: specweave
**As a** developer with a UI project
**I want** auto mode to track which routes/buttons/viewports are tested
**So that** I know my E2E coverage is comprehensive

**Acceptance Criteria**:
- [x] **AC-US4-01**: Auto-generates manifest from routes (Next.js, React Router, etc.)
- [x] **AC-US4-02**: Tracks which routes have E2E tests
- [ ] **AC-US4-03**: Tracks critical buttons/actions tested
- [ ] **AC-US4-04**: Tracks viewports tested (mobile 375px, tablet 768px, desktop 1280px)
- [ ] **AC-US4-05**: Stop hook blocks if coverage manifest incomplete
- [ ] **AC-US4-06**: Reports coverage gaps in completion message

### US-005: Multi-Viewport E2E Enforcement
**Project**: specweave
**As a** developer building responsive UIs
**I want** E2E tests to run on multiple viewports
**So that** mobile/tablet users get the same quality

**Acceptance Criteria**:
- [ ] **AC-US5-01**: Playwright config includes mobile, tablet, desktop projects
- [ ] **AC-US5-02**: Stop hook verifies tests ran on all required viewports
- [ ] **AC-US5-03**: Block completion if viewport coverage incomplete
- [ ] **AC-US5-04**: Report which viewports are missing coverage

### US-006: World-Class UI/UX Quality Gates
**Project**: specweave
**As a** developer building user-facing features
**I want** auto mode to enforce UI/UX quality standards
**So that** the result is polished, not just functional

**Acceptance Criteria**:
- [ ] **AC-US6-01**: Accessibility audit runs (axe-core) before completion
- [ ] **AC-US6-02**: No critical accessibility violations allowed
- [ ] **AC-US6-03**: Console errors during E2E fail the build
- [ ] **AC-US6-04**: Loading states must be present and tested
- [ ] **AC-US6-05**: Error states must be present and tested
- [ ] **AC-US6-06**: Empty states must be present and tested

### US-007: Increment Queue Transition
**Project**: specweave
**As a** developer with multiple increments queued
**I want** auto mode to transition smoothly between increments
**So that** I can queue 3-5 increments and let them complete overnight

**Acceptance Criteria**:
- [ ] **AC-US7-01**: When current increment completes, auto moves to next in queue
- [ ] **AC-US7-02**: Session state tracks completed/failed increments
- [ ] **AC-US7-03**: Transition includes summary of completed increment
- [ ] **AC-US7-04**: Failed increment doesn't block queue (skip with error log)

## Out of Scope

- Visual regression testing (screenshot comparison) - future increment
- Performance budgets (Lighthouse scores) - future increment
- Cross-browser testing (Firefox, Safari) - future increment

## Technical Notes

### Stop Hook Changes (stop-auto.sh)

```bash
# NEW: Parse actual test results
parse_test_results() {
    local transcript="$1"

    # Extract failure count from various formats
    local vitest_fail=$(grep -oE '[0-9]+ failed' "$transcript" | head -1 | grep -oE '[0-9]+')
    local jest_fail=$(grep -oE 'Tests:.*[0-9]+ failed' "$transcript" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+')
    local playwright_fail=$(grep -oE '[0-9]+ failed' "$transcript" | head -1 | grep -oE '[0-9]+')

    # Return total failures
    echo $((vitest_fail + jest_fail + playwright_fail))
}

# NEW: Self-healing loop
handle_test_failure() {
    local failure_msg="$1"
    local retry_count=$(jq -r '.testRetryCount // 0' "$SESSION_FILE")

    if [ "$retry_count" -lt 3 ]; then
        # Increment and continue
        jq ".testRetryCount = $((retry_count + 1))" "$SESSION_FILE" > tmp && mv tmp "$SESSION_FILE"
        block "Test failure (attempt $((retry_count + 1))/3)" \
              "🔴 TESTS FAILED - FIX AND RETRY\n\n$failure_msg\n\nAnalyze error, fix code, re-run tests."
    else
        # Escalate to human
        approve "Tests failed 3x - human review required"
    fi
}
```

### E2E Coverage Manifest Structure

```json
{
  "routes": {
    "/": { "tested": true, "viewports": ["mobile", "desktop"] },
    "/login": { "tested": true, "viewports": ["mobile", "tablet", "desktop"] },
    "/dashboard": { "tested": false, "viewports": [] }
  },
  "criticalActions": {
    "login-submit": { "tested": true },
    "add-to-cart": { "tested": false },
    "checkout-submit": { "tested": false }
  },
  "viewportsCovered": {
    "mobile": true,
    "tablet": false,
    "desktop": true
  },
  "coverage": {
    "routes": 66,
    "actions": 33,
    "viewports": 66
  }
}
```

### Intelligent Chunking Algorithm

```typescript
interface ChunkingResult {
  increments: IncrementPlan[];
  dependencies: DependencyGraph;
  estimatedTasks: number;
}

function analyzeAndChunk(prompt: string): ChunkingResult {
  // 1. Extract features/modules from prompt
  const features = extractFeatures(prompt);

  // 2. Estimate complexity per feature
  const complexities = features.map(estimateComplexity);

  // 3. Group into right-sized increments (5-15 tasks)
  const increments = groupIntoIncrements(features, complexities, {
    minTasks: 5,
    maxTasks: 15,
    preferSingleDeliverable: true
  });

  // 4. Identify dependencies
  const dependencies = buildDependencyGraph(increments);

  return { increments, dependencies, estimatedTasks: sum(complexities) };
}
```

## Success Metrics

- Zero false "all tests pass" claims
- 100% of test failures trigger self-healing loop
- E2E coverage manifest generated for all UI projects
- All viewports tested before completion
- Big prompts always split into proper increments
