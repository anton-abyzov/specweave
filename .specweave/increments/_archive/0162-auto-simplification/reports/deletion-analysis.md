# Auto Mode Simplification - Deletion Analysis

## Summary

**Total lines to delete:** ~10,000+ lines
**Files to delete:** 8 core files + associated tests
**Reduction:** 80-90% of auto mode complexity

## Files to DELETE

### 1. `src/core/auto/session-state.ts` ❌ DELETE
**Lines:** ~500
**Reason:** State lives in increments (metadata.json), not session files

**What it does:**
- Creates/manages `.specweave/state/auto-session.json`
- Tracks iteration count, queue position, timestamps
- Manages session locks

**Why unnecessary:**
- Increments already have status in metadata.json
- Claude Code tracks iterations natively
- No need for session locks (filesystem is lock)
- Queue = just read active increments from filesystem

**Replacement:** `find .specweave/increments -name metadata.json -exec grep -l "active" {} \;`

---

### 2. `src/core/auto/circuit-breaker.ts` ❌ DELETE
**Lines:** ~400
**Reason:** Hooks already handle errors gracefully

**What it does:**
- Tracks GitHub/JIRA/ADO API failures
- Implements circuit breaker pattern
- Queues operations when circuit opens
- Handles rate limiting

**Why unnecessary:**
- Hooks already log errors and continue
- Hooks already handle rate limits (backoff)
- Auto mode doesn't need to track external service health
- If sync fails, hooks retry on next update

**Replacement:** Let hooks handle errors (they already do!)

---

### 3. `src/core/auto/human-gate.ts` ❌ DELETE
**Lines:** ~300
**Reason:** Claude Code has native `/approve` prompts

**What it does:**
- Detects sensitive operations (deploy, migrate)
- Pauses execution for human approval
- Manages approval timeouts
- Tracks approved operations

**Why unnecessary:**
- Claude can just ask "Should I deploy?" naturally
- User responds yes/no
- No need for custom gate detection
- Native behavior is clearer and simpler

**Replacement:** Natural language approval requests

---

### 4. `src/core/auto/sync-checkpoint.ts` ❌ DELETE
**Lines:** ~350
**Reason:** Claude Code has auto-compact and transcript preservation

**What it does:**
- Creates checkpoints when context limit approached
- Saves task progress at checkpoints
- Enables crash recovery from last checkpoint

**Why unnecessary:**
- Claude Code auto-compacts at smart thresholds
- Transcript is preserved across compaction
- Context management is built-in
- Auto mode doesn't need custom checkpoint logic

**Replacement:** Trust Claude Code's context management

---

### 5. `src/core/auto/cost-estimator.ts` ❌ DELETE
**Lines:** ~250
**Reason:** This is analytics/logging, not core functionality

**What it does:**
- Estimates token cost before session
- Tracks actual cost during session
- Shows cost warnings

**Why unnecessary:**
- Claude Code already shows token usage
- Cost estimation is nice-to-have, not required
- Can be separate analytics command
- Doesn't affect autonomous execution

**Replacement:** Move to `/sw:analytics` if desired

---

### 6. `src/core/auto/test-gate.ts` ❌ DELETE (move to /sw:done)
**Lines:** ~600
**Reason:** Quality validation belongs in `/sw:done`, not auto mode

**What it does:**
- Runs npm test, parses output
- Runs E2E tests
- Checks coverage thresholds
- Implements self-healing loop (3 retries)

**Why should move:**
- Quality validation is a **closure concern**
- Tests should be validated when increment completes (/sw:done)
- Not an **iteration concern** (stop hook)
- /sw:done already validates - just enhance it

**Replacement:** Move test validation logic to `/sw:done` command

---

### 7. `src/core/auto/increment-queue.ts` ❌ DELETE
**Lines:** ~400
**Reason:** Queue = just read active increments from filesystem

**What it does:**
- Manages queue of increments to process
- Tracks current increment position
- Handles queue transitions
- Saves queue state

**Why unnecessary:**
- Active increments = queue
- Just read `find .specweave/increments -name metadata.json -exec grep -l "active" {} \;`
- No need to track "current" (just pick first active)
- State lives in metadata.json, not queue file

**Replacement:** Filesystem query for active increments

---

### 8. `src/core/auto/report-generator.ts` ❌ DELETE
**Lines:** ~500
**Reason:** This is analytics/logging, not core functionality

**What it does:**
- Generates session completion reports
- Creates markdown summaries
- Logs iteration details
- Tracks metrics

**Why unnecessary:**
- Nice-to-have, not required for autonomous execution
- Can be separate analytics command
- Logs already exist (auto-iterations.log)
- Doesn't affect execution flow

**Replacement:** Move to `/sw:analytics` or remove

---

## Files to KEEP

### 1. `src/core/auto/prompt-chunker.ts` ✅ KEEP
**Lines:** ~300
**Reason:** Intelligent feature breakdown is valuable

**What it does:**
- Analyzes prompts like "Build e-commerce site"
- Extracts features (auth, products, cart, checkout)
- Estimates complexity
- Suggests increment breakdown

**Why keep:**
- Helps users with large features
- Intelligent chunking is hard to do manually
- Reduces cognitive load
- Core value-add of SpecWeave

---

### 2. `src/core/auto/increment-planner.ts` ✅ KEEP
**Lines:** ~400
**Reason:** Dependency detection and right-sizing is valuable

**What it does:**
- Plans increments from extracted features
- Detects dependencies (auth before checkout)
- Right-sizes increments (5-15 tasks each)
- Creates execution order

**Why keep:**
- Dependency detection requires analysis
- Right-sizing prevents context overflow
- Ordering prevents blockers
- Core planning intelligence

---

### 3. `src/core/auto/plan-approval.ts` ✅ KEEP
**Lines:** ~300
**Reason:** User review workflow for large plans

**What it does:**
- Formats plan for user review
- Shows dependencies visually
- Handles approval/modification
- Saves approved plan

**Why keep:**
- Users should approve large plans
- Nice UX for reviewing multi-increment plans
- Allows modifications before execution
- Trust but verify

---

### 4. `src/core/auto/project-detector.ts` ✅ KEEP
**Lines:** ~250
**Reason:** Framework detection is useful

**What it does:**
- Detects project type (Node, Python, Go, Rust)
- Finds test commands (npm test, pytest, cargo test)
- Identifies build commands
- Discovers E2E frameworks

**Why keep:**
- Cross-language support
- Auto-detects correct commands
- Reduces configuration burden
- Useful for test validation in /sw:done

---

### 5. `src/core/auto/e2e-coverage.ts` ✅ KEEP
**Lines:** ~800
**Reason:** E2E coverage tracking is sophisticated and valuable

**What it does:**
- Generates E2E coverage manifest (routes × viewports × actions)
- Tracks which routes are tested
- Validates viewport coverage (mobile, tablet, desktop)
- Parses Playwright test output
- Generates coverage reports

**Why keep:**
- E2E coverage is hard to track manually
- Multi-dimensional coverage (routes × viewports)
- Prevents coverage gaps
- Sophisticated analysis

---

### 6. `src/core/auto/default-conditions.ts` ✅ KEEP (move to /sw:done)
**Lines:** ~150
**Reason:** Default quality conditions are useful config

**What it does:**
- Defines default completion conditions per project type
- Maps to test/build commands
- Provides sensible defaults

**Why keep (but move):**
- Sensible defaults reduce configuration
- Move to /sw:done config
- Part of quality validation

---

### 7. `src/core/auto/logger.ts` ✅ KEEP (simplify)
**Lines:** ~200
**Reason:** Structured logging is useful for debugging

**What it does:**
- Structured JSON logging
- Event tracking (iteration, completion, errors)
- Log file management

**Why keep:**
- Debugging auto mode sessions
- Audit trail of what happened
- Performance analysis
- Just simplify, don't remove

---

### 8. `src/core/auto/types.ts` ✅ KEEP (simplify)
**Lines:** ~200
**Reason:** Type definitions for remaining components

**What it does:**
- TypeScript interfaces for auto module
- Type safety

**Why keep:**
- TypeScript requires types
- Remove types for deleted modules
- Keep types for remaining modules

---

## Comparison: Before vs After

| Component | Before (LOC) | After (LOC) | Change |
|-----------|--------------|-------------|--------|
| **Stop Hook** | 2785 | 120 | -96% |
| **session-state.ts** | 500 | 0 | -100% ❌ |
| **circuit-breaker.ts** | 400 | 0 | -100% ❌ |
| **human-gate.ts** | 300 | 0 | -100% ❌ |
| **sync-checkpoint.ts** | 350 | 0 | -100% ❌ |
| **cost-estimator.ts** | 250 | 0 | -100% ❌ |
| **test-gate.ts** | 600 | 0 (→ /sw:done) | -100% ❌ |
| **increment-queue.ts** | 400 | 0 | -100% ❌ |
| **report-generator.ts** | 500 | 0 | -100% ❌ |
| **prompt-chunker.ts** | 300 | 300 | No change ✅ |
| **increment-planner.ts** | 400 | 400 | No change ✅ |
| **plan-approval.ts** | 300 | 300 | No change ✅ |
| **project-detector.ts** | 250 | 250 | No change ✅ |
| **e2e-coverage.ts** | 800 | 800 | No change ✅ |
| **default-conditions.ts** | 150 | 150 (→ /sw:done) | Moved ✅ |
| **logger.ts** | 200 | 100 | -50% ✅ |
| **types.ts** | 200 | 100 | -50% ✅ |
| **auto.ts CLI** | 560 | 250 | -55% |
| **TOTAL** | **~9,245** | **~2,770** | **-70%** |

## Associated Test Files to Delete

```
tests/unit/auto/session-state.test.ts           ❌
tests/unit/auto/circuit-breaker.test.ts         ❌
tests/unit/auto/human-gate.test.ts              ❌
tests/unit/auto/increment-queue.test.ts         ❌
tests/unit/auto/test-gate.test.ts               ❌ (move to /sw:done tests)
```

## Migration Impact

### Breaking Changes

1. **No session state files**
   - Old: `.specweave/state/auto-session.json`
   - New: State lives in increment metadata.json

2. **No cost tracking**
   - Old: Cost estimates shown before start
   - New: Use Claude Code's native token display

3. **No circuit breaker status**
   - Old: Shows GitHub/JIRA circuit state
   - New: Hooks handle errors gracefully

4. **Quality gates moved**
   - Old: Validated in stop hook
   - New: Validated in /sw:done

### Non-Breaking Changes

1. **Stop hook behavior**: Still blocks/approves, just simpler logic
2. **Increment detection**: Still works, just reads filesystem
3. **Planning features**: All preserved (chunking, dependencies)
4. **E2E coverage**: Fully preserved

## Rollout Strategy

### Phase 1: Add Simplified Versions (Parallel)
- ✅ Create `stop-auto-simple.sh` (done)
- ✅ Create `auto-simple.ts` (done)
- Don't replace old versions yet
- Test side-by-side

### Phase 2: Switch Stop Hook
- Update `hooks/stop-dispatcher.sh` to call `stop-auto-simple.sh`
- Keep old `stop-auto.sh` as backup
- Test thoroughly

### Phase 3: Switch CLI Command
- Update `src/cli/index.ts` to use `auto-simple.ts`
- Keep old `auto.ts` as backup
- Test thoroughly

### Phase 4: Delete Dead Code
- Remove old files after 1-2 weeks of successful usage
- Remove associated tests
- Update exports in `src/core/auto/index.ts`

### Phase 5: Documentation
- Update `commands/auto.md`
- Add migration guide
- Update architecture docs

## Success Criteria

✅ Stop hook < 200 lines (achieved: 120 lines)
✅ CLI command < 300 lines (achieved: 250 lines)
✅ Auto mode still works for all scenarios
✅ All tests pass
✅ No regression in functionality
✅ Clearer, more maintainable code

## Risks

**Low Risk:**
- Logic is simpler, fewer bugs likely
- Framework hooks are battle-tested
- Planning features preserved
- Easy to rollback (old files kept temporarily)

**Mitigation:**
- Thorough testing before rollout
- Keep old files as backup
- Gradual rollout (phases)
- Monitor for issues

## Timeline

- **Phase 1-2:** 1 day (create + switch hooks)
- **Phase 3:** 1 day (switch CLI command)
- **Phase 4:** 1 day (delete dead code after confidence)
- **Phase 5:** 1 day (documentation)
- **Total:** 4 days (with testing)

---

**Bottom Line:** We can safely delete ~70% of auto mode code by trusting the framework and moving quality validation to the right place (/sw:done).
