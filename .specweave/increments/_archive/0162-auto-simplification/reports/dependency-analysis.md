# Auto Mode Dependency Analysis

**Date**: 2026-01-08
**Increment**: 0162-auto-simplification

## Current State

### Stop Hook Complexity
- **Current**: stop-auto.sh - 2785 lines
- **Simplified**: stop-auto-simple.sh - 118 lines
- **Reduction**: 95.7%

### Core Auto Components (18 files)

```
src/core/auto/
├── circuit-breaker.ts       ❌ REMOVE (hooks handle errors)
├── config.ts                ✅ KEEP (configuration)
├── cost-estimator.ts        ❌ REMOVE (analytics, not core)
├── default-conditions.ts    ✅ KEEP (iteration conditions)
├── e2e-coverage.ts          ✅ KEEP (E2E manifest tracking)
├── human-gate.ts            ❌ REMOVE (use native /approve)
├── increment-planner.ts     ✅ KEEP (dependency detection)
├── increment-queue.ts       ❌ REMOVE (just read filesystem)
├── index.ts                 ✅ KEEP (exports)
├── logger.ts                ✅ KEEP (logging utilities)
├── plan-approval.ts         ✅ KEEP (user review workflow)
├── project-detector.ts      ✅ KEEP (framework detection)
├── prompt-chunker.ts        ✅ KEEP (intelligent breakdown)
├── report-generator.ts      ❌ REMOVE (analytics)
├── session-state.ts         ❌ REMOVE (state in increments)
├── sync-checkpoint.ts       ❌ REMOVE (Claude Code handles)
├── test-gate.ts             ❌ REMOVE (move to /sw:done)
└── types.ts                 ✅ KEEP (type definitions)
```

## Components to Remove (8 files)

### 1. session-state.ts ❌
**Why Remove**: State already lives in increment metadata.json
- Tracks active increments → Read from `.specweave/increments/*/metadata.json`
- Tracks completion status → Already in metadata
- Session persistence → Not needed, increments are persistent

**Current Usage**:
```typescript
// src/cli/commands/auto.ts
import { SessionStateManager } from '../../core/auto/session-state.js';

const state = new SessionStateManager(projectRoot);
await state.load();
```

**Replacement**:
```typescript
// Just read from filesystem
const increments = await listActiveIncrements(projectRoot);
```

### 2. circuit-breaker.ts ❌
**Why Remove**: Framework hooks already handle external service errors
- Tracks API failures → Hooks have retry logic
- Circuit open/close → Not needed, hooks handle it
- Manual error handling → Hooks are event-driven

**Current Usage**:
```typescript
const breaker = new CircuitBreaker();
if (breaker.isOpen('github')) {
  // Skip GitHub sync
}
```

**Replacement**: Trust hooks! They already handle GitHub/JIRA/ADO errors.

### 3. human-gate.ts ❌
**Why Remove**: Claude Code has native `/approve` command
- Custom approval logic → Use native /approve
- Approval tracking → Not needed in framework

**Current Usage**:
```typescript
const gate = new HumanGate();
await gate.requestApproval('Deploy to prod?');
```

**Replacement**: Use Claude Code's native approval flow.

### 4. sync-checkpoint.ts ❌
**Why Remove**: Claude Code handles state persistence automatically
- Manual checkpointing → Claude Code does this
- State snapshots → Not needed

**Current Usage**:
```typescript
await checkpoint.save();
```

**Replacement**: Remove entirely - Claude Code handles persistence.

### 5. cost-estimator.ts ❌
**Why Remove**: Analytics feature, not core to auto mode
- Token counting → Nice-to-have, not critical
- Cost tracking → Analytics only

**Current Usage**:
```typescript
const cost = estimator.calculate(prompt);
```

**Replacement**: Remove - this is analytics, not core functionality.

### 6. test-gate.ts ❌
**Why Remove**: Quality validation belongs in `/sw:done`, not iteration loop
- Runs tests → Should be in /sw:done Gate 2
- Validates build → Should be in /sw:done Gate 2
- Blocks on failure → /sw:done should block

**Current Usage**:
```typescript
const testGate = new TestGate();
const passed = await testGate.validate();
```

**Replacement**: Move logic to /sw:done command (Gate 2: Tests Passing).

### 7. increment-queue.ts ❌
**Why Remove**: Simple filesystem scan is sufficient
- Complex queue management → Just read from filesystem
- Priority sorting → Filesystem order is fine

**Current Usage**:
```typescript
const queue = new IncrementQueue();
const next = await queue.getNext();
```

**Replacement**:
```typescript
const activeIncrements = fs.readdirSync('.specweave/increments')
  .filter(dir => {
    const metadata = JSON.parse(fs.readFileSync(`${dir}/metadata.json`));
    return metadata.status === 'active';
  });
```

### 8. report-generator.ts ❌
**Why Remove**: Analytics feature, not core
- Generates completion reports → Nice-to-have
- Session summaries → Analytics only

**Current Usage**:
```typescript
const report = generator.generateReport(session);
```

**Replacement**: Remove - this is analytics.

## Components to Keep (10 files)

### prompt-chunker.ts ✅
**Why Keep**: Intelligent feature breakdown is valuable
- Splits large features into increments
- Detects dependencies
- Estimates scope

### increment-planner.ts ✅
**Why Keep**: Dependency detection is core functionality
- Analyzes requirements
- Plans increment structure
- Critical for large features

### plan-approval.ts ✅
**Why Keep**: User review workflow is important
- Shows plan to user
- Gets approval before implementation
- Prevents wasted effort

### project-detector.ts ✅
**Why Keep**: Framework detection enables smart defaults
- Detects React/Vue/Next.js
- Enables framework-specific optimizations
- Provides better DX

### e2e-coverage.ts ✅
**Why Keep**: E2E test tracking prevents flaky tests
- Tracks E2E test coverage
- Ensures critical paths tested
- Quality metric

### config.ts ✅
**Why Keep**: Configuration management
- Loads auto mode settings
- Provides defaults
- Essential

### default-conditions.ts ✅
**Why Keep**: Iteration stop conditions
- Defines when to continue
- When to stop
- Core logic

### logger.ts ✅
**Why Keep**: Logging utilities
- Structured logging
- Debug support
- Essential

### types.ts ✅
**Why Keep**: Type definitions
- TypeScript types
- Essential for type safety

### index.ts ✅
**Why Keep**: Module exports
- Public API
- Clean imports

## Quality Gates → /sw:done Migration

### Current (test-gate.ts)
```typescript
class TestGate {
  async validate(): Promise<boolean> {
    // Run tests
    const testResult = await runTests();

    // Run build
    const buildResult = await runBuild();

    // Check E2E
    const e2eResult = await runE2E();

    return testResult && buildResult && e2eResult;
  }
}
```

### Target (/sw:done Gate 2)
```typescript
// In done.ts command
async function validateTestsGate(incrementId: string): Promise<ValidationResult> {
  const errors: string[] = [];

  // Gate 2.1: Unit tests
  const testResult = await runCommand('npm test');
  if (testResult.exitCode !== 0) {
    errors.push('Unit tests failing');
  }

  // Gate 2.2: Build
  const buildResult = await runCommand('npm run build');
  if (buildResult.exitCode !== 0) {
    errors.push('Build failing');
  }

  // Gate 2.3: E2E tests (if exist)
  if (fs.existsSync('playwright.config.ts')) {
    const e2eResult = await runCommand('npx playwright test');
    if (e2eResult.exitCode !== 0) {
      errors.push('E2E tests failing');
    }
  }

  // Gate 2.4: Coverage
  const coverage = await getCoverage();
  if (coverage < 80) {
    errors.push(`Coverage too low: ${coverage}% (target: 80%)`);
  }

  return {
    passed: errors.length === 0,
    errors
  };
}
```

## Manual Sync Logic to Remove

### GitHub Sync (auto.ts)
```typescript
// ❌ REMOVE - hooks handle this
await githubSync.updateIssue(issueNumber, {
  tasks: completedTasks,
  status: 'in-progress'
});
```

**Replacement**: Remove entirely. The `post-task-completion.sh` hook already syncs to GitHub.

### JIRA Sync (auto.ts)
```typescript
// ❌ REMOVE - hooks handle this
await jiraSync.updateEpic(epicKey, {
  tasks: completedTasks
});
```

**Replacement**: Remove entirely. The `post-task-completion.sh` hook already syncs to JIRA.

### Living Docs Sync (auto.ts)
```typescript
// ❌ REMOVE - hooks handle this
await syncToLivingDocs(incrementId);
```

**Replacement**: Remove entirely. The `post-increment-completion.sh` hook already syncs living docs.

### AC Updates (auto.ts)
```typescript
// ❌ REMOVE - hooks handle this
await updateACStatus(incrementId, taskId);
```

**Replacement**: Remove entirely. The `post-task-completion.sh` hook already updates ACs.

## Refactored auto.ts Structure

### Current (Complex)
```typescript
// ~500 lines, lots of manual management
async function executeAutoMode() {
  const state = new SessionStateManager();
  const queue = new IncrementQueue();
  const breaker = new CircuitBreaker();
  const testGate = new TestGate();

  while (true) {
    const increment = await queue.getNext();

    // Execute tasks
    for (const task of increment.tasks) {
      await executeTask(task);

      // Manual sync
      if (!breaker.isOpen('github')) {
        await syncToGitHub();
      }

      // Update ACs
      await updateACStatus();
    }

    // Run quality gates
    const passed = await testGate.validate();
    if (!passed) continue;

    // Complete increment
    await completeIncrement();
  }
}
```

### Target (Simple)
```typescript
// ~100 lines, trust the framework
async function executeAutoMode() {
  // Find active increments (state lives in filesystem)
  const activeIncrements = await findActiveIncrements();

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
  // - /sw:done validates quality (tests, build, E2E, coverage)
  // - Hooks transition status automatically

  return {
    action: 'continue',
    prompt,
    increments: activeIncrements
  };
}
```

## Success Metrics

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Stop hook LOC | 2785 | 118 | 95.7% |
| Core auto LOC | ~5000 | ~1000 | 80% |
| Files in src/core/auto/ | 18 | 10 | 44% |
| Manual sync calls | Many | 0 | 100% |
| Quality gates in auto | 1 | 0 | 100% (moved to /sw:done) |

## Implementation Plan

### Phase 1: Analysis ✅
- [x] Map dependencies
- [x] Identify removal targets
- [x] Document keep vs remove

### Phase 2: Stop Hook ⏳
- [ ] Test stop-auto-simple.sh
- [ ] Replace stop-auto.sh with simple version
- [ ] Verify <200 lines

### Phase 3: CLI Refactoring ⏳
- [ ] Remove SessionStateManager usage
- [ ] Remove IncrementQueue usage
- [ ] Remove CircuitBreaker usage
- [ ] Simplify main loop

### Phase 4: Quality Gates ⏳
- [ ] Add test validation to /sw:done
- [ ] Add build validation to /sw:done
- [ ] Add E2E validation to /sw:done
- [ ] Add coverage validation to /sw:done

### Phase 5: Cleanup ⏳
- [ ] Delete 8 removed components
- [ ] Update imports
- [ ] Fix compilation errors

### Phase 6: Testing ⏳
- [ ] E2E test: Multi-increment auto mode
- [ ] E2E test: Tests failing scenario
- [ ] E2E test: Build errors scenario

## Conclusion

The current auto mode implementation is massively over-engineered because it reimplements features that already exist in the SpecWeave framework:

- ✅ **State management** → Increments ARE the state
- ✅ **Sync logic** → Hooks handle GitHub/JIRA/ADO
- ✅ **AC updates** → Hooks update spec.md
- ✅ **Quality validation** → /sw:done validates tests/build/coverage
- ✅ **Status transitions** → Hooks auto-transition

By trusting the framework and removing manual management, we can:
- Reduce LOC by 80%+
- Remove 8 unnecessary components
- Simplify maintenance
- Improve reliability (hooks are battle-tested)
