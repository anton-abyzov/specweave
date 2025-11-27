---
total_tasks: 20
completed: 0
by_user_story:
  US-001: 5
  US-002: 6
  US-003: 4
  US-004: 5
test_mode: TDD
coverage_target: 95
---

# Tasks: Fix Automatic GitHub Sync on Increment Creation

## User Story: US-001 - Automatic Living Docs Sync on Increment Creation

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Tasks**: 5 total, 0 completed

### T-001: Enhance detectExternalTools() to Check config.json

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-04
**Priority**: P0 (Critical)
**Estimated Effort**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** a project with GitHub profile configured in `.specweave/config.json`
- **And** metadata.json does not yet have `github` section
- **When** `detectExternalTools()` is called during increment creation
- **Then** it should return `['github']` by detecting the global profile
- **And** living docs sync should proceed to external tool sync

**Test Cases**:
1. **Unit**: `tests/unit/living-docs/external-tool-detection.test.ts`
   - testDetectFromMetadataOnly(): metadata.json has `github` → returns `['github']`
   - testDetectFromConfigOnly(): config.json has `activeProfile` → returns `['github']`
   - testDetectFromBoth(): Both sources present → returns `['github']` (deduplicated)
   - testDetectMultipleTools(): config.json has GitHub + Jira → returns `['github', 'jira']`
   - testDetectNone(): No config anywhere → returns `[]`
   - testPrecedence(): metadata.json takes precedence over config.json
   - **Coverage Target**: 95%

2. **Integration**: `tests/integration/sync/external-tool-detection-integration.test.ts`
   - testEndToEndDetection(): Create increment → verify detectExternalTools() called → verify correct tools detected
   - testConfigJsonDetection(): GitHub profile in config.json → verify detection during sync
   - **Coverage Target**: 90%

**Overall Coverage Target**: 93%

**Implementation**:
1. Open `src/core/living-docs/living-docs-sync.ts` (lines 891-950)
2. Locate `private async detectExternalTools(incrementId: string)` method
3. Add LEVEL 2 detection after existing metadata check:
   - Read `.specweave/config.json`
   - Extract `config.plugins.settings['specweave-github'].activeProfile`
   - If profile exists and has `token`, `owner`, `repo` → add 'github' to tools array
4. Add similar logic for Jira and ADO profiles
5. Add enhanced logging: `tools.length === 0` → log "No external tools detected"
6. Deduplicate tools array: `return [...new Set(tools)]`
7. Update JSDoc comment to document Level 1 (metadata) vs Level 2 (config) detection
8. Run unit tests: `npm test external-tool-detection.test` (should pass: 6/6)
9. Verify coverage: `npm run coverage -- --include=src/core/living-docs/living-docs-sync.ts` (should be ≥95%)

**TDD Workflow**:
1. 📝 Write all 8 tests above (should fail)
   - 6 unit tests in external-tool-detection.test.ts
   - 2 integration tests in external-tool-detection-integration.test.ts
2. ❌ Run tests: `npm test` (0/8 passing)
3. ✅ Implement enhanced detectExternalTools() (steps 1-7)
4. 🟢 Run tests: `npm test` (8/8 passing)
5. ♻️ Refactor if needed (maintain green tests)
6. ✅ Final check: Coverage ≥93%

---

### T-002: Add Enhanced Logging to detectExternalTools()

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Priority**: P0 (Critical)
**Estimated Effort**: 1 hour
**Status**: [ ] pending

**Test Plan**:
- **Given** detectExternalTools() is executing
- **When** it checks metadata.json and config.json
- **Then** it should log the detection path taken
- **And** help developers debug sync issues

**Test Cases**:
1. **Unit**: `tests/unit/living-docs/external-tool-logging.test.ts`
   - testLogNoToolsDetected(): No tools → logs "No external tools detected" + paths checked
   - testLogToolsDetected(): GitHub detected → logs "External tools detected: github"
   - testLogConfigDetection(): Detected from config.json → logs profile ID
   - testLogMetadataDetection(): Detected from metadata → logs increment path
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. In `detectExternalTools()` method (after tools array populated)
2. Add logging block:
   ```typescript
   if (tools.length === 0) {
     this.logger.log(`   ℹ️  No external tools detected for ${incrementId}`);
     this.logger.log(`      - Checked metadata.json: ${existsSync(metadataPath) ? 'exists' : 'missing'}`);
     this.logger.log(`      - Checked config.json: ${existsSync(configPath) ? 'exists' : 'missing'}`);
   } else {
     this.logger.log(`   📡 External tools detected: ${tools.join(', ')}`);
   }
   ```
3. Add profile logging when GitHub detected from config:
   ```typescript
   this.logger.log(`   ✅ GitHub sync enabled (global config, profile: ${githubProfile})`);
   ```
4. Write unit tests with mock logger
5. Run tests: `npm test external-tool-logging.test` (should pass: 4/4)
6. Verify coverage: `npm run coverage` (should be ≥95%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test` (0/4 passing)
3. ✅ Implement logging (steps 1-3)
4. 🟢 Run tests: `npm test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥95%

---

### T-003: Create sync-living-docs.js Hook Script

**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Priority**: P0 (Critical)
**Estimated Effort**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** an increment ID passed to sync-living-docs.js
- **When** the script executes
- **Then** it should call LivingDocsSync.syncIncrement()
- **And** create living docs files (FEATURE.md and us-*.md)
- **And** trigger external tool sync if configured

**Test Cases**:
1. **Unit**: `tests/unit/hooks/sync-living-docs.test.ts`
   - testScriptLoadsCorrectly(): Script can be loaded and parsed
   - testIncrementIdExtraction(): Extracts increment ID from argv
   - testLivingDocsSyncCalled(): Verifies LivingDocsSync.syncIncrement() called
   - testErrorHandling(): Script exits gracefully on error
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/hooks/sync-living-docs-execution.test.ts`
   - testEndToEndSync(): Run script → verify living docs created
   - testGitHubSyncTriggered(): Run script with GitHub config → verify GitHub sync called
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create file: `plugins/specweave/lib/hooks/sync-living-docs.js`
2. Add shebang: `#!/usr/bin/env node`
3. Import LivingDocsSync: `import { LivingDocsSync } from '../../../src/core/living-docs/living-docs-sync.js';`
4. Extract increment ID from process.argv[2]
5. Call LivingDocsSync.syncIncrement() with increment ID
6. Add error handling: try/catch with process.exit(0) in catch (non-blocking)
7. Add logging: Start, success, error messages
8. Make executable: `chmod +x plugins/specweave/lib/hooks/sync-living-docs.js`
9. Write unit tests (4 tests)
10. Run tests: `npm test sync-living-docs.test` (should pass: 4/4)
11. Write integration tests (2 tests)
12. Run integration tests: `npm test sync-living-docs-execution` (should pass: 2/2)
13. Verify coverage: `npm run coverage` (should be ≥88%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Implement sync-living-docs.js script (steps 1-8)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

---

### T-004: Create post-increment-planning.sh Hook

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-04
**Priority**: P0 (Critical)
**Estimated Effort**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** increment-planner skill emits IncrementCreated notification
- **When** post-increment-planning.sh hook is triggered
- **Then** it should call sync-living-docs.js in background
- **And** return immediately (non-blocking)
- **And** handle errors gracefully

**Test Cases**:
1. **Unit**: `tests/unit/hooks/post-increment-planning.test.ts`
   - testRecursionGuard(): Multiple calls → only first executes
   - testIncrementIdValidation(): No increment ID → exits gracefully
   - testSyncScriptDetection(): Finds sync script in multiple locations
   - testBackgroundExecution(): Script runs in background (doesn't block)
   - testErrorHandling(): Sync failure → logs warning, exits 0
   - **Coverage Target**: 92%

2. **Integration**: `tests/integration/hooks/post-increment-hook-execution.test.ts`
   - testFullHookExecution(): Trigger hook → verify sync script called
   - testGitHubTokenLoading(): Hook loads GITHUB_TOKEN from .env
   - testNonBlockingBehavior(): Hook returns immediately while sync runs
   - **Coverage Target**: 88%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create file: `plugins/specweave/hooks/post-increment-planning.sh`
2. Add shebang: `#!/bin/bash`
3. Add safety header:
   ```bash
   set +e  # Don't propagate errors
   PROJECT_ROOT="$(find_project_root "$(pwd)")"
   cd "$PROJECT_ROOT" 2>/dev/null || true
   ```
4. Add recursion guard:
   ```bash
   RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"
   if [[ -f "$RECURSION_GUARD_FILE" ]]; then exit 0; fi
   touch "$RECURSION_GUARD_FILE"
   trap 'rm -f "$RECURSION_GUARD_FILE" 2>/dev/null || true' EXIT
   ```
5. Extract increment ID from SPECWEAVE_INCREMENT_ID env var
6. Find sync-living-docs.js script (check 3 locations)
7. Load GITHUB_TOKEN from .env if present
8. Run sync in background: `(node "$SYNC_SCRIPT" "$INCREMENT_ID") &`
9. Exit immediately: `exit 0`
10. Make executable: `chmod +x plugins/specweave/hooks/post-increment-planning.sh`
11. Write unit tests (5 tests)
12. Run tests: `npm test post-increment-planning.test` (should pass: 5/5)
13. Write integration tests (3 tests)
14. Run integration tests: `npm test post-increment-hook-execution` (should pass: 3/3)
15. Verify coverage: `npm run coverage` (should be ≥90%)

**TDD Workflow**:
1. 📝 Write all 8 tests above (should fail)
2. ❌ Run tests: `npm test` (0/8 passing)
3. ✅ Implement post-increment-planning.sh hook (steps 1-10)
4. 🟢 Run tests: `npm test` (8/8 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥90%

---

### T-005: Verify LivingDocsSync.syncIncrement() Calls External Tool Sync

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Priority**: P0 (Critical)
**Estimated Effort**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** LivingDocsSync.syncIncrement() is called
- **And** detectExternalTools() returns ['github']
- **When** living docs are created successfully
- **Then** syncToExternalTools() should be called automatically
- **And** GitHub milestone and issues should be created

**Test Cases**:
1. **Unit**: `tests/unit/living-docs/sync-increment-flow.test.ts`
   - testSyncIncrement CallsExternalTools(): Mock detectExternalTools → verify syncToExternalTools called
   - testSkipsExternalSyncWhenDryRun(): dryRun option → syncToExternalTools not called
   - testSkipsExternalSyncWhenDisabled(): SKIP_EXTERNAL_SYNC=true → syncToExternalTools not called
   - testExternalSyncAfterLivingDocs(): Verify external sync happens AFTER living docs created
   - **Coverage Target**: 94%

2. **Integration**: `tests/integration/sync/living-docs-to-github-flow.test.ts`
   - testCompleteSyncFlow(): syncIncrement → living docs created → GitHub synced
   - testExternalToolDetectionTiming(): Verify detectExternalTools called at right time
   - **Coverage Target**: 90%

**Overall Coverage Target**: 92%

**Implementation**:
1. Open `src/core/living-docs/living-docs-sync.ts` (lines 242-255)
2. Locate the syncIncrement() method
3. Verify existing code structure:
   ```typescript
   if (!options.dryRun && !skipExternalSync) {
     await this.syncToExternalTools(incrementId, featureId, projectPath);
   }
   ```
4. Add enhanced logging BEFORE external sync:
   ```typescript
   const externalTools = await this.detectExternalTools(incrementId);
   this.logger.log(`🔍 Detected external tools: ${externalTools.join(', ')}`);
   ```
5. Add conditional logging:
   ```typescript
   if (externalTools.length === 0) {
     this.logger.log(`⏭️  No external tools configured, skipping sync`);
   }
   ```
6. Write unit tests (4 tests) with mocks for detectExternalTools and syncToExternalTools
7. Run unit tests: `npm test sync-increment-flow.test` (should pass: 4/4)
8. Write integration tests (2 tests)
9. Run integration tests: `npm test living-docs-to-github-flow` (should pass: 2/2)
10. Verify coverage: `npm run coverage` (should be ≥92%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test` (0/6 passing)
3. ✅ Add enhanced logging to syncIncrement() (steps 1-5)
4. 🟢 Run tests: `npm test` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥92%
