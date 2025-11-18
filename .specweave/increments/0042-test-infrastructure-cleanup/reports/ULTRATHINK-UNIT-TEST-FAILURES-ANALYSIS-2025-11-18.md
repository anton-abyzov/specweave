# Ultrathink Analysis: Unit Test Failures

**Date**: 2025-11-18
**Scope**: All failing unit tests (54 failures across 10 files)
**Goal**: Systematic root cause analysis and fix strategy

---

## Executive Summary

**Total Failures**: 54 tests across 10 files
**Pass Rate**: 97.6% (2200 passed / 2260 total)
**Critical Issues**: 5 root cause categories identified

---

## Root Cause Categories

### 1. Module Import/Resolution Errors (1 file, ~10 tests)

**File**: `tests/unit/sync/enhanced-jira-sync.test.ts`

**Error**:
```
Error: Failed to load url ../../../src/core/sync/enhanced-content-builder.js
Does the file exist?
```

**Root Cause**:
- Plugin file (`plugins/specweave-jira/lib/enhanced-jira-sync.js`) importing from non-existent path
- Likely the module was moved/renamed but plugin wasn't updated

**Fix Strategy**:
1. Verify `enhanced-content-builder.js` actual location
2. Update import paths in `enhanced-jira-sync.js`
3. Or create missing module if it was deleted

---

### 2. Missing Template Structure (13 tests)

**File**: `tests/unit/iac/azure-functions-template.test.ts`

**Errors**:
- `defaults.json` not found
- Template rendering fails with "containerName not defined"
- Multiple undefined property errors

**Root Cause**:
- Azure Functions template structure incomplete
- Missing `defaults.json` file at `plugins/specweave/templates/iac/azure-functions/defaults.json`
- Template variables missing containerName field

**Fix Strategy**:
1. Create `defaults.json` with all required Azure-specific defaults
2. Update template variables to include containerName
3. Verify all .hbs templates have correct variable references

---

### 3. Mock Configuration Issues (19 tests)

**Files**:
- `tests/unit/cli/migrate-to-profiles.test.ts` (16 failures)
- `tests/unit/cli/init-multiproject.test.ts` (3 failures)

**Errors**:
- Spy call expectations failing
- ProfileManager/ProjectContextManager mocks not working
- Mock functions not being called
- "Maximum call stack size exceeded" (recursive mock issue)

**Root Cause**:
- vi.mock() setup incorrect for class constructors
- Mocks not properly configured before module imports
- Possible circular dependency in mocks

**Fix Strategy**:
1. Use vi.mocked() for type-safe mock setup
2. Ensure mocks configured BEFORE imports
3. Fix recursive mock issue (likely fs.pathExists infinite loop)
4. Verify ProfileManager/ProjectContextManager mock implementations

---

### 4. Missing Source Files/Patterns (7 tests)

**File**: `tests/unit/init/user-friendly-questions.test.ts`

**Errors**:
- Expected 5+ question strings, found 0
- Missing USER-FRIENDLY markers
- Missing help text patterns

**Root Cause**:
- Test expects specific comment patterns in `src/init/InitFlow.ts`
- File either:
  - Doesn't exist at expected path
  - Has different structure (no Question: comments)
  - Was refactored and test not updated

**Fix Strategy**:
1. Check if InitFlow.ts exists at `src/init/InitFlow.ts`
2. If missing, either:
   - Skip tests (mark as TODO)
   - Create file with expected patterns
   - Update tests to match actual structure

---

### 5. Missing Test Fixtures (7 tests)

**File**: `tests/unit/plugin-system/plugin-loader.test.ts`

**Errors**:
- `plugin.json not found` at test fixture path
- `loader.validate is not a function`

**Root Cause**:
- Missing fixture directory structure
- PluginLoader missing validate() method

**Fix Strategy**:
1. Create test fixture: `tests/fixtures/plugins/specweave-test/.claude-plugin/plugin.json`
2. Implement PluginLoader.validate() method
3. Add manifest validation logic

---

### 6. Config/State Management Issues (5 tests)

**Files**:
- `tests/unit/config/config-manager.test.ts` (3 failures)
- `tests/unit/cicd/state-manager.test.ts` (2 failures)

**Errors**:
- Zod validation errors
- File locking errors (ENOENT)
- Concurrency test failing

**Root Cause**:
- ConfigManager schema changes (Zod validation)
- StateManager lock file path issues
- Concurrency test timing issues

**Fix Strategy**:
1. Update test mocks to match new Zod schema
2. Ensure lock directory exists before testing
3. Fix concurrency test logic

---

### 7. Workflow Monitor Issues (2 tests)

**File**: `tests/unit/cicd/workflow-monitor.test.ts`

**Errors**:
- setInterval is not a spy
- Test timeout (10s)

**Root Cause**:
- Missing vi.spyOn for setInterval
- Rate limiting test hanging

**Fix Strategy**:
1. Add vi.spyOn(global, 'setInterval')
2. Use vi.useFakeTimers() for interval testing
3. Add timeout protection to async test

---

### 8. Logic Error (1 test)

**File**: `tests/unit/increment/status-auto-transition.test.ts`

**Error**: `expected true to be false`

**Root Cause**:
- Test assertion inversed
- "does not transition if all tasks pending" expects false, gets true

**Fix Strategy**:
- Review transition logic
- Fix either the logic or the test assertion

---

## Fix Priority

### High Priority (Blocking)
1. ✅ Enhanced JIRA sync - module imports (blocks integration)
2. ✅ Azure Functions templates - missing defaults.json (blocks IaC generation)
3. ✅ Mock configuration - migrate-to-profiles (16 failures)

### Medium Priority
4. ✅ Plugin loader - missing fixtures & validate method
5. ✅ Init multiproject - spy expectations
6. ✅ User-friendly questions - source file patterns

### Low Priority (Quick Fixes)
7. ✅ Status auto-transition - logic error (1 line fix)
8. ✅ Config manager - Zod schema updates
9. ✅ State manager - file locking
10. ✅ Workflow monitor - spy setup

---

## Implementation Plan

### Phase 1: Infrastructure (Missing Files)
- [ ] Create Azure Functions defaults.json
- [ ] Create plugin loader test fixtures
- [ ] Verify enhanced-content-builder module exists

### Phase 2: Mock Fixes (Most Failures)
- [ ] Fix migrate-to-profiles mock configuration
- [ ] Fix init-multiproject spy expectations
- [ ] Resolve recursive mock issue

### Phase 3: Logic & Schema
- [ ] Fix status auto-transition assertion
- [ ] Update config-manager Zod mocks
- [ ] Fix state-manager lock path
- [ ] Fix workflow-monitor spy setup

### Phase 4: Documentation/Skipping
- [ ] Handle user-friendly-questions (skip or implement)

---

## Testing Strategy

After each fix:
1. Run specific test file: `npm run test:unit -- <file>`
2. Verify no regressions
3. Move to next priority

Final verification:
```bash
npm run test:unit
# Expected: 0 failures, 2260 passed
```

---

## Risk Assessment

**Low Risk Fixes** (Safe):
- Missing files (create with proper structure)
- Test assertions (obvious logic errors)
- Spy setup (standard Vitest patterns)

**Medium Risk Fixes** (Needs Verification):
- Mock configurations (may affect other tests)
- Schema updates (verify against actual code)

**High Risk Fixes** (Careful Review):
- Module imports (could indicate architectural issue)
- Recursive mocks (may hide deeper problem)

---

## Success Criteria

- [ ] All 54 failing tests pass
- [ ] No new test failures introduced
- [ ] Coverage remains >80%
- [ ] All fixes documented in this report
