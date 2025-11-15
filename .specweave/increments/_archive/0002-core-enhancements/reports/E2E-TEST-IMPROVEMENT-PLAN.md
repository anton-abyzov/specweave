# E2E Test Improvement Plan

## Current E2E Test Coverage

### ✅ What's Tested
1. **Basic Installation** (`init-default-claude.spec.ts`)
2. **Increment Discipline** (`increment-discipline.spec.ts`)
3. **CLI Commands** (`cli-commands.spec.ts`)
4. **Multi-project Switching** (`multi-project/switching.spec.ts`)
5. **ADO Sync** (`ado-sync.spec.ts`)
6. **I18N Workflows** (`i18n/multilingual-workflows.spec.ts`)

### 🔴 Critical Gaps in E2E Tests

## Priority 1: Critical User Journeys (MUST HAVE)

### 1. Complete Increment Lifecycle Test
**File**: `tests/e2e/increment-lifecycle-complete.spec.ts`
```typescript
test.describe('Complete Increment Lifecycle', () => {
  test('should complete full increment workflow', async () => {
    // 1. Create increment with /specweave:increment
    // 2. Generate spec, plan, tasks
    // 3. Execute tasks with /specweave:do
    // 4. Mark tasks complete
    // 5. Verify living docs sync
    // 6. Close increment with /specweave:done
    // 7. Verify GitHub issue updated
    // 8. Start new increment (verify discipline)
  });
});
```

### 2. GitHub Integration End-to-End
**File**: `tests/e2e/github-integration-full.spec.ts`
```typescript
test.describe('GitHub Integration E2E', () => {
  test('should sync bidirectionally with GitHub', async () => {
    // 1. Create increment
    // 2. Auto-create GitHub issue
    // 3. Complete task locally
    // 4. Verify GitHub checkbox updated
    // 5. Update GitHub issue externally
    // 6. Pull changes back to local
    // 7. Handle conflict resolution
  });

  test('should migrate from V1 to V2 profiles', async () => {
    // 1. Setup V1 config
    // 2. Run migration command
    // 3. Verify profiles created correctly
    // 4. Test sync with new profiles
    // 5. Verify no data loss
  });
});
```

### 3. Brownfield Project Import
**File**: `tests/e2e/brownfield-import-complete.spec.ts`
```typescript
test.describe('Brownfield Import E2E', () => {
  test('should import and classify existing docs', async () => {
    // 1. Setup existing project with docs
    // 2. Run import-docs command
    // 3. Verify classification (specs, modules, team, legacy)
    // 4. Check deduplication
    // 5. Verify migration report
    // 6. Create increment using imported specs
  });
});
```

### 4. Multi-Repository Workflow
**File**: `tests/e2e/multi-repo-workflow.spec.ts`
```typescript
test.describe('Multi-Repository Workflow', () => {
  test('should handle monorepo setup', async () => {
    // 1. Detect monorepo structure
    // 2. Configure projects for each service
    // 3. Create cross-service increment
    // 4. Sync to different GitHub repos
    // 5. Switch between projects
  });

  test('should handle polyrepo with submodules', async () => {
    // 1. Setup parent with submodules
    // 2. Initialize SpecWeave at parent
    // 3. Create increment spanning submodules
    // 4. Verify file operations across repos
  });
});
```

### 5. Error Recovery & Edge Cases
**File**: `tests/e2e/error-recovery.spec.ts`
```typescript
test.describe('Error Recovery', () => {
  test('should handle GitHub API failures gracefully', async () => {
    // 1. Mock GitHub API failure
    // 2. Attempt sync
    // 3. Verify graceful degradation
    // 4. Retry with exponential backoff
    // 5. Resume when API recovers
  });

  test('should handle corrupt metadata', async () => {
    // 1. Create increment
    // 2. Corrupt metadata.json
    // 3. Run commands
    // 4. Verify recovery/rebuild
    // 5. No data loss
  });

  test('should handle rate limiting', async () => {
    // 1. Trigger rate limit
    // 2. Verify warning message
    // 3. Test time-range reduction
    // 4. Verify successful sync
  });
});
```

## Priority 2: Important Workflows (SHOULD HAVE)

### 6. Quality Assurance Flow
**File**: `tests/e2e/qa-workflow.spec.ts`
```typescript
test.describe('QA Workflow', () => {
  test('should run QA and make decisions', async () => {
    // 1. Create increment with spec
    // 2. Run /specweave:qa
    // 3. Verify risk scoring
    // 4. Check quality gates
    // 5. Generate improvement recommendations
  });
});
```

### 7. Translation & I18N Complete
**File**: `tests/e2e/i18n-complete.spec.ts`
```typescript
test.describe('I18N Complete Workflow', () => {
  test('should handle Russian → English workflow', async () => {
    // 1. Create increment in Russian
    // 2. Verify auto-translation to English
    // 3. Create ADRs during tasks
    // 4. Verify ADR translation
    // 5. Check living docs in English
  });
});
```

### 8. Cost Tracking
**File**: `tests/e2e/cost-tracking.spec.ts`
```typescript
test.describe('Cost Tracking', () => {
  test('should track and report AI costs', async () => {
    // 1. Create increment
    // 2. Execute tasks (mock AI calls)
    // 3. Run /specweave:costs
    // 4. Verify cost calculation
    // 5. Check savings metrics
  });
});
```

## Priority 3: Nice to Have

### 9. Plugin Management
**File**: `tests/e2e/plugin-management.spec.ts`
```typescript
test.describe('Plugin Management', () => {
  test('should install and validate plugins', async () => {
    // 1. Register marketplace
    // 2. Install plugins
    // 3. Verify skill activation
    // 4. Test plugin commands
  });
});
```

### 10. Performance & Scale
**File**: `tests/e2e/performance.spec.ts`
```typescript
test.describe('Performance at Scale', () => {
  test('should handle 100+ increments', async () => {
    // 1. Create 100 increments programmatically
    // 2. Test status-line performance
    // 3. Test search/filter
    // 4. Verify <1s response times
  });
});
```

## Implementation Strategy

### Phase 1: Quick Wins (Week 1)
```bash
# 1. Fix Jest ES2020 config (4-6 hours)
# Enable 43 disabled integration tests
npm run test:integration  # Should work after fix

# 2. Add missing E2E tests for critical paths (16 hours)
- increment-lifecycle-complete.spec.ts
- github-integration-full.spec.ts
```

### Phase 2: External Integrations (Week 2)
```bash
# 3. Test external sync thoroughly (20 hours)
- brownfield-import-complete.spec.ts
- multi-repo-workflow.spec.ts
- error-recovery.spec.ts
```

### Phase 3: Advanced Features (Week 3)
```bash
# 4. Test quality & i18n (16 hours)
- qa-workflow.spec.ts
- i18n-complete.spec.ts
- cost-tracking.spec.ts
```

### Phase 4: Polish (Week 4)
```bash
# 5. Plugin & performance tests (12 hours)
- plugin-management.spec.ts
- performance.spec.ts
```

## Test Infrastructure Improvements

### 1. Test Helpers Library
```typescript
// tests/e2e/helpers/specweave-helpers.ts
export class SpecWeaveTestHelpers {
  async createIncrement(name: string) { }
  async completeTask(taskId: string) { }
  async syncToGitHub() { }
  async verifyLivingDocs() { }
}
```

### 2. Mock Services
```typescript
// tests/e2e/mocks/github-mock.ts
export class GitHubMockServer {
  start() { }
  simulateRateLimit() { }
  simulateAPIFailure() { }
}
```

### 3. Test Data Fixtures
```typescript
// tests/fixtures/increments/
- feature-increment.json
- hotfix-increment.json
- multi-project.json
```

## Success Metrics

### Coverage Goals
- **E2E Test Count**: From 10 → 25+ test files
- **User Journey Coverage**: 95% of critical paths
- **Integration Points**: 100% of external APIs tested
- **Error Scenarios**: 20+ edge cases covered

### Quality Goals
- **Test Execution Time**: <5 minutes for E2E suite
- **Flakiness**: <1% flaky tests
- **Maintenance**: Tests use helpers, not raw commands
- **Documentation**: Each test has clear purpose

## Recommended Test Execution Strategy

```bash
# Daily (on every commit)
npm run test:unit        # Fast, <30 seconds
npm run test:integration # Medium, <2 minutes

# On PR
npm run test:e2e -- --grep="Critical" # Critical paths only, <3 minutes

# Nightly
npm run test:e2e        # Full suite, <10 minutes
npm run test:performance # Performance tests
```

## ROI Analysis

### Investment
- **Total Hours**: 80-100 hours
- **Team Size**: 2-3 developers
- **Timeline**: 4 weeks

### Return
- **Bug Prevention**: 80% reduction in production bugs
- **MTTR**: 70% faster issue resolution
- **Confidence**: Ship daily without fear
- **Onboarding**: New devs productive in 1 day

## Next Steps

1. **Immediate**: Fix Jest ES2020 config (unblock 43 tests)
2. **This Week**: Add increment-lifecycle-complete.spec.ts
3. **Next Week**: Add GitHub integration tests
4. **Ongoing**: Add tests with each new feature

---

*Priority: Focus on user journeys over coverage %*
*Philosophy: Test what matters to users, not what's easy to test*