# ADR-0225: Auto Mode Simplification - Trust the Framework

**Status**: Accepted (Phase 1 implemented)
**Date**: 2026-01-08
**Updated**: 2026-02-09
**Decision Makers**: Core Team
**Related**: ADR-0221 (Auto Mode Architecture)

## Context

The current `/sw:auto` implementation has grown to be massively over-engineered:

- **2785 lines** in `stop-auto.sh` hook
- **~5000 lines** of TypeScript in `src/core/auto/`
- **18 components**, many reimplementing existing framework features
- Complex session state management when increments already store state
- Manual sync logic when hooks already handle GitHub/JIRA/ADO sync
- Quality gates in auto loop when they belong in `/sw:done`

### The Problem

Auto mode suffers from **distrust of the framework**. It manually manages concerns that the SpecWeave framework already handles:

| Concern | Manual Implementation | Framework Solution |
|---------|---------------------|-------------------|
| State persistence | SessionStateManager (500+ LOC) | Increments (metadata.json) |
| External sync | Manual GitHub/JIRA/ADO calls | Event-driven hooks |
| AC updates | Manual spec.md updates | post-task-completion hook |
| Quality validation | test-gate.ts (200+ LOC) | /sw:done command |
| Status transitions | Manual status updates | auto-transition hook |
| Queue management | IncrementQueue (300+ LOC) | Simple filesystem scan |
| Error handling | CircuitBreaker (250+ LOC) | Hooks have retry logic |

### Why This Happened

1. **Early development** - Auto mode predates many framework features
2. **Organic growth** - Features added incrementally without refactoring
3. **Distrust** - Not realizing hooks already handle these concerns
4. **Over-engineering** - Anticipating problems that never materialized

### Evidence of Over-Engineering

**Stop Hook Complexity**:
```bash
# Current stop-auto.sh: 2785 lines
# - Session state management
# - Manual sync orchestration
# - Quality gate checking
# - Report generation
# - Cost estimation
# - Circuit breaker logic

# Simplified stop-auto-simple.sh: 118 lines (95.7% reduction)
# - Check if active increments exist
# - Block if yes, approve if no
# - Trust framework for everything else
```

**Manual Sync (Unnecessary)**:
```typescript
// ❌ Current: Manual sync in auto mode
await githubSync.updateIssue(issueNumber, { tasks });
await jiraSync.updateEpic(epicKey, { tasks });
await syncToLivingDocs(incrementId);
await updateACStatus(incrementId, taskId);

// ✅ Framework: Hooks already do this!
// post-task-completion.sh → syncs GitHub/JIRA/ADO
// post-task-completion.sh → updates spec.md ACs
// post-increment-completion.sh → syncs living docs
```

## Decision

**Simplify auto mode by trusting the framework.**

### Core Principle

> **Increments ARE the state. Hooks ARE the sync. /sw:done IS the quality gate.**

Auto mode should orchestrate, not duplicate. Its responsibilities:

1. **Find active increments** (read from filesystem)
2. **Re-feed continuation prompt** (keep working on active increments)
3. **Trust the framework** for everything else

### What Gets Removed (8 components)

1. **session-state.ts** ❌ - State lives in increments
2. **circuit-breaker.ts** ❌ - Hooks have retry logic
3. **human-gate.ts** ❌ - Use Claude Code's native /approve
4. **sync-checkpoint.ts** ❌ - Claude Code handles persistence
5. **cost-estimator.ts** ❌ - Analytics, not core
6. **test-gate.ts** ❌ - Move to /sw:done
7. **increment-queue.ts** ❌ - Simple filesystem scan
8. **report-generator.ts** ❌ - Analytics, not core

### What Gets Kept (10 components)

1. **prompt-chunker.ts** ✅ - Intelligent feature breakdown
2. **increment-planner.ts** ✅ - Dependency detection
3. **plan-approval.ts** ✅ - User review workflow
4. **project-detector.ts** ✅ - Framework detection
5. **e2e-coverage.ts** ✅ - E2E test tracking
6. **config.ts** ✅ - Configuration
7. **default-conditions.ts** ✅ - Iteration conditions
8. **logger.ts** ✅ - Logging
9. **types.ts** ✅ - Type definitions
10. **index.ts** ✅ - Exports

### Refactored Architecture

#### Before (Complex)
```typescript
async function executeAutoMode() {
  const state = new SessionStateManager();      // ❌ Manage state
  const queue = new IncrementQueue();           // ❌ Manage queue
  const breaker = new CircuitBreaker();         // ❌ Error handling
  const testGate = new TestGate();              // ❌ Quality gates

  while (true) {
    const increment = await queue.getNext();    // ❌ Complex queue

    for (const task of increment.tasks) {
      await executeTask(task);

      if (!breaker.isOpen('github')) {          // ❌ Manual sync
        await syncToGitHub();
      }

      await updateACStatus();                   // ❌ Manual AC update
    }

    const passed = await testGate.validate();   // ❌ Manual validation
    if (!passed) continue;

    await completeIncrement();                  // ❌ Manual completion
  }
}
```

#### After (Simple)
```typescript
async function executeAutoMode() {
  // Find active increments (state lives in filesystem)
  const activeIncrements = fs.readdirSync('.specweave/increments')
    .filter(dir => {
      const metadata = JSON.parse(fs.readFileSync(`${dir}/metadata.json`));
      return metadata.status === 'active';
    });

  if (activeIncrements.length === 0) {
    console.log('✅ All increments complete!');
    return;
  }

  // Re-feed prompt to continue work
  const prompt = buildContinuationPrompt(activeIncrements);

  // Trust the framework:
  // - /sw:do executes tasks
  // - Hooks sync to GitHub/JIRA/ADO on edits
  // - Hooks update ACs when tasks complete
  // - /sw:done validates quality (tests, build, E2E)
  // - Hooks transition status automatically

  return {
    action: 'continue',
    prompt,
    increments: activeIncrements
  };
}
```

### Stop Hook Simplification

#### Before (2785 lines)
- Session state loading/saving
- Manual GitHub/JIRA/ADO sync
- Quality gate validation
- Report generation
- Cost estimation
- Circuit breaker checks
- Checkpoint management

#### After (118 lines)
```bash
#!/bin/bash
# Find active increments
ACTIVE=$(find .specweave/increments -name "metadata.json" \
  -exec grep -l '"status": "active"' {} \; | wc -l)

if [ "$ACTIVE" -eq 0 ]; then
  # All complete - approve exit
  echo '{"decision": "approve", "systemMessage": "✅ All complete!"}'
else
  # Work remains - block exit
  echo '{"decision": "block", "reason": "Continue working on active increments"}'
fi
```

### Quality Gates Migration

Move from auto loop to `/sw:done` command (where they belong):

```typescript
// /sw:done now validates:
// Gate 0: Automated checks (tasks complete, ACs checked)
// Gate 1: PM validation (tasks done)
// Gate 2: Tests passing ← NEW (from test-gate.ts)
// Gate 3: Documentation updated

// Gate 2 implementation:
async function validateTestsGate(incrementId: string) {
  const errors: string[] = [];

  // 2.1: Unit tests
  const testResult = await runCommand('npm test');
  if (testResult.exitCode !== 0) {
    errors.push('Unit tests failing');
  }

  // 2.2: Build
  const buildResult = await runCommand('npm run build');
  if (buildResult.exitCode !== 0) {
    errors.push('Build failing');
  }

  // 2.3: E2E tests
  if (fs.existsSync('playwright.config.ts')) {
    const e2eResult = await runCommand('npx playwright test');
    if (e2eResult.exitCode !== 0) {
      errors.push('E2E tests failing');
    }
  }

  // 2.4: Coverage
  const coverage = await getCoverage();
  if (coverage < 80) {
    errors.push(`Coverage too low: ${coverage}%`);
  }

  return { passed: errors.length === 0, errors };
}
```

## Consequences

### Positive

1. **Massive LOC reduction**: 80% less code to maintain
   - Stop hook: 2785 → 118 lines (95.7% reduction)
   - Core auto: ~5000 → ~1000 lines (80% reduction)
   - Total files: 18 → 10 (44% reduction)

2. **Simpler mental model**: Trust the framework
   - No manual sync calls
   - No manual state management
   - No duplicate quality validation

3. **More reliable**: Hooks are battle-tested
   - Event-driven sync works automatically
   - No manual sync coordination needed
   - Hooks handle edge cases (rate limits, errors, retries)

4. **Easier to maintain**: Less code = fewer bugs
   - 8 components removed completely
   - No complex state management
   - Simple filesystem reads

5. **Better separation of concerns**:
   - Auto mode = orchestration
   - Hooks = sync and updates
   - /sw:done = quality validation

### Negative

1. **Breaking change**: Existing auto mode workflows may need adjustment
   - Session state not available (use increment metadata instead)
   - IncrementQueue removed (use simple filesystem scan)

2. **Migration effort**: 2-3 days of work
   - Refactor auto.ts
   - Move test gates to /sw:done
   - Delete 8 components
   - Update all imports

3. **Testing required**: Need thorough E2E testing
   - Multi-increment scenarios
   - Various failure modes
   - Hook integration verification

### Neutral

1. **Learning curve**: Developers need to trust the framework
   - Resist urge to add manual sync
   - Understand hooks handle concerns
   - Know when to use /sw:done vs auto loop

## Implementation Plan

### Phase 1: Stop Hook (High Value, Low Risk) - COMPLETED 2026-02-09
- [x] Create stop-auto-v5.sh (166 lines, gate-only design)
- [x] 46 passing tests (29 integration + 17 unit)
- [x] Activate v5 hook in hooks.json (timeout reduced 120s → 15s)
- [x] Archive stop-auto.sh → _archive/stop-auto-v4-legacy.sh
- [x] SKILL.md rewritten to match reality (removed auto-heal, framework detection claims)

### Phase 2: Auto.ts Refactoring (Medium Risk - 8 hours)
- [ ] Remove SessionStateManager usage
- [ ] Remove IncrementQueue (use filesystem scan)
- [ ] Remove CircuitBreaker usage
- [ ] Simplify main execution loop

### Phase 3: Quality Gates (Medium Risk - 6 hours)
- [ ] Add test validation to /sw:done
- [ ] Add build validation to /sw:done
- [ ] Add E2E validation to /sw:done
- [ ] Add coverage validation to /sw:done

### Phase 4: Cleanup (Low Risk - 2 hours)
- [ ] Delete 8 over-engineered components
- [ ] Update imports
- [ ] Fix compilation errors

### Phase 5: Testing & Docs (4 hours)
- [ ] E2E test: Multi-increment auto mode
- [ ] E2E test: Tests failing scenario
- [ ] E2E test: Build errors scenario
- [ ] Update commands/auto.md
- [ ] Create migration guide

**Total Effort**: 24 hours (3 days)

## Alternatives Considered

### Alternative 1: Keep Current Implementation

**Pros**:
- No migration effort
- No breaking changes
- Familiar to existing developers

**Cons**:
- 2785 lines of stop hook to maintain
- ~5000 lines of duplicate logic
- Manual sync prone to bugs
- Quality gates in wrong place
- Technical debt accumulates

**Decision**: ❌ Rejected - Technical debt is unsustainable

### Alternative 2: Incremental Simplification

**Pros**:
- Lower risk per change
- Can validate each step
- Easier to rollback

**Cons**:
- Longer timeline (4-6 weeks)
- Incomplete benefits until final phase
- More coordination overhead

**Decision**: ✅ Adopted as implementation strategy

### Alternative 3: Complete Rewrite

**Pros**:
- Clean slate
- Optimal architecture
- No legacy constraints

**Cons**:
- 1-2 weeks of work
- High risk of breaking features
- Need comprehensive testing
- Loss of battle-tested edge case handling

**Decision**: ❌ Rejected - Too risky, refactoring is sufficient

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Stop hook LOC | 1320 (v4) | 166 (v5) | <200 |
| Core auto LOC | ~5000 | ~1000 | <1200 |
| Component count | 18 | 10 | <12 |
| Manual sync calls | Many | 0 | 0 |
| Quality gates in auto | Yes | No | No |
| Test execution time | Slow | Fast | <5s |
| Maintainability | Poor | Good | High |

## Related Decisions

- **ADR-0221**: Auto Mode Architecture (original design)
- **ADR-0062**: GitHub Marketplace Mode (trust committed code)
- **ADR-0148**: Event-Driven Hooks (sync automation)

## References

- Increment 0162-auto-simplification
- reports/dependency-analysis.md
- reports/implementation-status.md
- stop-auto-simple.sh (118 lines)
- stop-auto.sh (2785 lines - to be archived)

## Review Notes

**For reviewers**:
1. Review stop-auto-simple.sh - does it handle all cases?
2. Verify hooks already cover sync concerns
3. Confirm /sw:done is right place for quality gates
4. Test plan adequate for 80% code reduction?

**Open questions**:
1. Should we keep cost-estimator.ts for analytics?
2. Any edge cases in stop-auto.sh we're missing?
3. Migration path for existing auto sessions?

---

**Approved by**: Implemented
**Implementation**: Increment 0196-auto-mode-v5-stop-hook (Phase 1), Follow-up increments (Phase 2-5)
