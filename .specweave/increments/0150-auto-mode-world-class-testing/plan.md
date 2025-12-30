# Implementation Plan: Auto Mode World-Class Testing

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        /sw:auto "Build e-commerce app"                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: INTELLIGENT CHUNKING (NEW!)                                        │
│                                                                              │
│  1. Parse prompt → Extract features                                          │
│  2. Estimate complexity per feature                                          │
│  3. Create increment plan (5-15 tasks each)                                  │
│  4. Show plan to user → Approve/Modify                                       │
│  5. Create increments via /sw:increment                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: EXECUTION WITH SELF-HEALING (ENHANCED!)                            │
│                                                                              │
│  For each increment:                                                         │
│    For each task:                                                            │
│      1. Implement task                                                       │
│      2. Run tests                                                            │
│      3. If FAIL → Self-Healing Loop (max 3 attempts)                         │
│         ├─ Extract failure details                                           │
│         ├─ Inject fix prompt                                                 │
│         ├─ Re-run tests                                                      │
│         └─ If 3x fail → Human gate                                           │
│      4. If PASS → Next task                                                  │
│      5. Update tasks.md, spec.md                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: QUALITY GATES (NEW!)                                               │
│                                                                              │
│  Before allowing completion:                                                 │
│    ✅ All unit tests pass (0 failures)                                       │
│    ✅ All integration tests pass                                             │
│    ✅ All E2E tests pass                                                     │
│    ✅ E2E coverage manifest complete                                         │
│       - All routes tested                                                    │
│       - All critical actions tested                                          │
│       - All viewports tested (mobile, tablet, desktop)                       │
│    ✅ Accessibility audit passes (no critical issues)                        │
│    ✅ No console errors in E2E                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Self-Healing Loop Deep Dive

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SELF-HEALING TEST LOOP                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  IMPLEMENT TASK                                                              │
│        │                                                                     │
│        ▼                                                                     │
│  ┌──────────┐                                                                │
│  │ RUN TESTS │◄──────────────────────────────────────────┐                   │
│  └──────────┘                                            │                   │
│        │                                                 │                   │
│        ▼                                                 │                   │
│  ┌───────────────┐     YES                               │                   │
│  │ ALL PASS?     │─────────────► NEXT TASK               │                   │
│  └───────────────┘                                       │                   │
│        │ NO                                              │                   │
│        ▼                                                 │                   │
│  ┌───────────────┐                                       │                   │
│  │ RETRY < 3?    │─── NO ────► HUMAN GATE (pause)        │                   │
│  └───────────────┘                                       │                   │
│        │ YES                                             │                   │
│        ▼                                                 │                   │
│  ┌───────────────────────────────────────┐               │                   │
│  │ EXTRACT FAILURE:                       │               │                   │
│  │  - Test file:line                      │               │                   │
│  │  - Error message                       │               │                   │
│  │  - Expected vs Received                │               │                   │
│  │  - Stack trace (relevant part)         │               │                   │
│  └───────────────────────────────────────┘               │                   │
│        │                                                 │                   │
│        ▼                                                 │                   │
│  ┌───────────────────────────────────────┐               │                   │
│  │ INJECT FIX PROMPT:                     │               │                   │
│  │                                        │               │                   │
│  │  "🔴 TEST FAILED (attempt 2/3)         │               │                   │
│  │                                        │               │                   │
│  │   File: auth.spec.ts:45                │               │                   │
│  │   Test: should redirect after login    │               │                   │
│  │   Error: expect(page).toHaveURL(...)   │               │                   │
│  │   Expected: /dashboard                 │               │                   │
│  │   Received: /login                     │               │                   │
│  │                                        │               │                   │
│  │   ANALYZE and FIX, then re-run tests"  │               │                   │
│  └───────────────────────────────────────┘               │                   │
│        │                                                 │                   │
│        ▼                                                 │                   │
│  ┌───────────────┐                                       │                   │
│  │ INCREMENT     │                                       │                   │
│  │ RETRY COUNT   │───────────────────────────────────────┘                   │
│  └───────────────┘                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Stop Hook Test Result Parsing (P0 - Critical)

**Files to modify:**
- `plugins/specweave/hooks/stop-auto.sh`

**Changes:**
1. Add `parse_test_results()` function
2. Add `extract_failure_details()` function
3. Replace weak grep with proper result parsing
4. Block on ANY failure (not just >3)

### Phase 2: Self-Healing Loop (P0 - Critical)

**Files to modify:**
- `plugins/specweave/hooks/stop-auto.sh`
- `src/core/auto/session-state.ts` (add testRetryCount)

**Changes:**
1. Add retry counter to session state
2. Implement `handle_test_failure()` with rich prompts
3. Reset retry counter on task completion
4. Escalate to human gate after 3 failures

### Phase 3: Intelligent Chunking (P0 - Critical)

**Files to modify:**
- `plugins/specweave/commands/auto.md`
- `plugins/specweave/scripts/setup-auto.sh`
- New: `src/core/auto/prompt-chunker.ts`

**Changes:**
1. Add prompt analysis before session setup
2. Extract features from natural language
3. Create increment plan with dependencies
4. Show plan for user approval
5. Create increments via API

### Phase 4: E2E Coverage Manifest (P1 - High)

**New files:**
- `src/core/auto/e2e-coverage-manifest.ts`
- `plugins/specweave/scripts/generate-e2e-manifest.sh`

**Changes:**
1. Auto-generate manifest from routes (detect framework)
2. Update manifest during test runs
3. Add manifest check to stop hook
4. Block completion if coverage incomplete

### Phase 5: Multi-Viewport Enforcement (P1 - High)

**Files to modify:**
- `plugins/specweave/hooks/stop-auto.sh`

**Changes:**
1. Detect viewport configuration in playwright.config
2. Verify tests ran on all configured viewports
3. Block if viewport coverage incomplete

### Phase 6: UI/UX Quality Gates (P2 - Medium)

**Files to modify:**
- `plugins/specweave/hooks/stop-auto.sh`
- New: `src/core/auto/quality-gates.ts`

**Changes:**
1. Run axe-core accessibility audit
2. Check for console errors in E2E output
3. Verify loading/error/empty states tested

## File Changes Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `plugins/specweave/hooks/stop-auto.sh` | Major rewrite | P0 |
| `src/core/auto/session-state.ts` | Add fields | P0 |
| `plugins/specweave/commands/auto.md` | Add chunking docs | P0 |
| `plugins/specweave/scripts/setup-auto.sh` | Add chunking call | P0 |
| `src/core/auto/prompt-chunker.ts` | New file | P0 |
| `src/core/auto/e2e-coverage-manifest.ts` | New file | P1 |
| `src/core/auto/quality-gates.ts` | New file | P2 |
| `tests/integration/auto/stop-hook.test.ts` | Add new tests | P0 |
| `tests/unit/auto/prompt-chunker.test.ts` | New file | P0 |

## Test Plan

### Unit Tests
- `prompt-chunker.test.ts`: Feature extraction, complexity estimation, chunking algorithm
- `session-state.test.ts`: Retry counter management, state transitions

### Integration Tests
- `stop-hook.test.ts`: Test result parsing, self-healing loop, viewport checks
- `e2e-manifest.test.ts`: Route detection, manifest generation

### E2E Tests
- Full auto session with failing tests → verify retry loop
- Multi-increment queue → verify transitions
- Big prompt → verify chunking

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stop hook becomes too slow | High | Optimize grep patterns, use single pass |
| False positives in failure detection | High | Test with multiple frameworks, handle edge cases |
| Chunking produces too many increments | Medium | Cap at 5-7 increments, merge small ones |
| E2E manifest detection fails | Medium | Support manual manifest override |
