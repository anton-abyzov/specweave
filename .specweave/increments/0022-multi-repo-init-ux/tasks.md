---
increment: 0022-multi-repo-init-ux
total_tasks: 15
completed_tasks: 11
test_mode: TDD
coverage_target: 85%
---

# Implementation Tasks: Multi-Repository Initialization UX Improvements

**Increment**: 0022-multi-repo-init-ux
**Living Docs**: [SPEC-022](../../docs/internal/projects/default/specs/spec-022-multi-repo-init-ux.md)
**Plan**: [plan.md](./plan.md)

---

## Phase 1: Core Modifications (Day 1)

### T-001: Remove services/ folder logic from repo-structure-manager.ts

**AC**: AC-US5-01, AC-US5-03

**Priority**: P1
**Estimate**: 2 hours
**Status**: [x] completed

**Test Plan** (BDD format):
- **Given** a parent repository setup with implementation repos
- **When** repositories are cloned locally
- **Then** they should be cloned at root level (e.g., `frontend/`, `backend/`)
- **And** NOT nested under `services/` folder

**Test Cases**:
1. **Unit** (`tests/unit/repo-structure/repo-structure-manager.test.ts`):
   - testRootLevelCloningPath(): Verify path generation without services/ → 90% coverage
   - testMultiRepoPathGeneration(): Test path mapping for multiple repos → 90% coverage
   - **Coverage Target**: 90%

2. **Integration** (`tests/integration/repo-structure/root-level-cloning.test.ts`):
   - testCompleteRootLevelSetup(): Full flow with root-level repos → 85% coverage
   - testGitignoreUpdate(): Verify .gitignore patterns updated → 85% coverage
   - **Coverage Target**: 85%

3. **E2E** (`tests/e2e/init/root-level-structure.spec.ts`):
   - userSeesRootLevelFolders(): Visual verification of folder structure → 100% critical path
   - folderStructureMatchesExpected(): Verify no services/ folder created → 100% critical path
   - **Coverage Target**: 100%

**Overall**: 88%

**Implementation**:
1. Open `src/core/repo-structure/repo-structure-manager.ts`
2. Locate line 865: Change `path.join(this.projectPath, repo.path)` (verify already correct)
3. Locate line 497: Ensure path generation uses `id` directly (not `services/${id}`)
4. Update .gitignore patterns to include root-level folders (frontend/, backend/, etc.)
5. Run tests: `npm test -- repo-structure-manager` (should pass: 15/15)
6. Run integration tests: `npm run test:integration -- root-level-cloning` (should pass: 3/3)
7. Run E2E tests: `npm run test:e2e -- root-level-structure` (should pass: 2/2)

**TDD Workflow**:
1. 📝 Write all tests above (should fail)
2. ❌ Run tests: `npm test` (0/20 passing)
3. ✅ Implement root-level path changes
4. 🟢 Run tests: `npm test` (20/20 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

**Dependencies**: None

---

### T-002: Simplify repository architecture questions

**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04

**Priority**: P1
**Estimate**: 2 hours
**Status**: [x] completed

**Test Plan** (BDD format):
- **Given** user runs `specweave init` for multi-repo setup
- **When** architecture prompt is shown
- **Then** single consolidated question should appear (not two separate prompts)
- **And** "polyrepo" jargon should be replaced with "multiple separate repositories"
- **And** parent repo count should be clarified (e.g., "1 parent + 3 implementation = 4 total")

**Test Cases**:
1. **Unit** (`tests/unit/repo-structure/prompt-consolidator.test.ts`):
   - testArchitecturePromptConsolidated(): Verify single prompt structure → 90% coverage
   - testNoPolyrepoJargon(): Ensure "polyrepo" not present → 90% coverage
   - testRepoCountClarification(): Verify count clarification text → 90% coverage
   - testVisualExamples(): Check examples in prompt options → 85% coverage
   - **Coverage Target**: 88%

2. **Integration** (`tests/integration/repo-structure/prompt-flow.test.ts`):
   - testPromptSequence(): Verify prompt order and consolidation → 85% coverage
   - testPromptDefaults(): Check default values → 85% coverage
   - **Coverage Target**: 85%

3. **E2E** (`tests/e2e/init/prompt-clarity.spec.ts`):
   - userSeesConsolidatedPrompt(): Single architecture question shown → 100% critical path
   - userUnderstandsMultiRepoTerminology(): Jargon-free language → 100% critical path
   - userSeesRepoCountExample(): Count clarification visible → 100% critical path
   - **Coverage Target**: 100%

**Overall**: 87%

**Implementation**:
1. Verify `src/core/repo-structure/prompt-consolidator.ts` exists and implements:
   - `getArchitecturePrompt()` - consolidated prompt (lines 30-50)
   - `getRepoCountClarification()` - count explanation (lines 80-95)
   - Visual examples in options
2. Verify integration in `repo-structure-manager.ts` (lines 102-130)
3. Test prompts interactively: `specweave init test-project`
4. Verify prompt text matches spec requirements
5. Run unit tests: `npm test -- prompt-consolidator` (should pass: 8/8)
6. Run integration tests: `npm run test:integration -- prompt-flow` (should pass: 4/4)
7. Run E2E tests: `npm run test:e2e -- prompt-clarity` (should pass: 3/3)

**TDD Workflow**:
1. 📝 Write all tests above (should fail)
2. ❌ Run tests: `npm test` (0/15 passing)
3. ✅ Verify/enhance prompt consolidator implementation
4. 🟢 Run tests: `npm test` (15/15 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥87%

**Dependencies**: None

---

### T-003: Integrate auto-ID generation with editable defaults

**AC**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04

**Priority**: P1
**Estimate**: 2 hours
**Status**: [x] completed

**Test Plan** (BDD format):
- **Given** user enters repository name "my-saas-frontend-app"
- **When** system generates ID
- **Then** ID should be "frontend" (strip suffixes, take last segment)
- **And** ID should be shown as editable default
- **And** uniqueness should be validated (reject duplicates)
- **And** comma-separated input should be rejected

**Test Cases**:
1. **Unit** (`tests/unit/repo-structure/repo-id-generator.test.ts`):
   - testGenerateRepoId(): Test ID generation algorithm → 92% coverage
   - testSuffixStripping(): Verify suffix removal → 92% coverage
   - testEnsureUniqueId(): Test uniqueness enforcement → 92% coverage
   - testValidateRepoId(): Test validation rules → 92% coverage
   - testCommaRejection(): Verify comma-separated input rejected → 90% coverage
   - **Coverage Target**: 91%

2. **Integration** (`tests/integration/repo-structure/auto-id-flow.test.ts`):
   - testAutoIDGenerationFlow(): Complete ID generation workflow → 87% coverage
   - testUserEditID(): User overrides generated ID → 87% coverage
   - testDuplicateIDHandling(): System prevents duplicates → 87% coverage
   - **Coverage Target**: 87%

3. **E2E** (`tests/e2e/init/auto-id-generation.spec.ts`):
   - userSeesGeneratedID(): Auto-generated ID displayed as default → 100% critical path
   - userCanEditID(): User can modify generated ID → 100% critical path
   - duplicateIDPrevented(): System shows error for duplicate ID → 100% critical path
   - **Coverage Target**: 100%

**Overall**: 89%

**Implementation**:
1. Verify `src/core/repo-structure/repo-id-generator.ts` exists (150 lines, 90% coverage)
2. Verify integration in `repo-structure-manager.ts` (lines 461-476)
3. Test ID generation:
   - "my-saas-frontend-app" → "frontend"
   - "acme-api-gateway-service" → "gateway"
   - "backend-service" → "backend"
4. Test uniqueness: "frontend" + "frontend" → "frontend-2"
5. Test validation: "parent,fe,be" → rejected
6. Run unit tests: `npm test -- repo-id-generator` (should pass: 12/12)
7. Run integration tests: `npm run test:integration -- auto-id-flow` (should pass: 5/5)
8. Run E2E tests: `npm run test:e2e -- auto-id-generation` (should pass: 3/3)

**TDD Workflow**:
1. 📝 Write all tests above (should fail, but module exists!)
2. ❌ Run tests: `npm test` (expected: most passing if module complete)
3. ✅ Enhance any missing functionality
4. 🟢 Run tests: `npm test` (20/20 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥89%

**Dependencies**: None

---

## Phase 2: Enhanced State Management (Days 2-3)

### T-004: Integrate setup-state-manager for Ctrl+C recovery

**AC**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05, AC-US7-06

**Priority**: P1
**Estimate**: 4 hours
**Status**: [x] completed

**Test Plan** (BDD format):
- **Given** user starts multi-repo setup
- **When** Ctrl+C is pressed during repo 2 of 3
- **Then** state should be saved to `.specweave/setup-state.json`
- **And** on restart, system should detect incomplete setup
- **And** offer to resume with progress summary ("2/3 repos configured")
- **And** delete state file on successful completion

**Test Cases**:
1. **Unit** (`tests/unit/repo-structure/setup-state-manager.test.ts`):
   - testSaveState(): Verify state persistence → 90% coverage
   - testAtomicWrites(): Test temp → rename pattern → 90% coverage
   - testStateValidation(): Verify state structure validation → 88% coverage
   - testCorruptionRecovery(): Test backup restoration → 88% coverage
   - testDeleteState(): Verify state cleanup → 85% coverage
   - **Coverage Target**: 88%

2. **Integration** (`tests/integration/repo-structure/ctrl-c-recovery.test.ts`):
   - testResumeAfterInterruption(): Complete Ctrl+C recovery flow → 87% coverage
   - testStateFilePermissions(): Verify 0600 permissions → 85% coverage
   - testBackupRestoration(): Test backup recovery → 85% coverage
   - **Coverage Target**: 86%

3. **E2E** (`tests/e2e/init/resume-setup.spec.ts`):
   - userCtrlCDuringSetup(): Interrupt and resume → 100% critical path
   - userSeesProgressSummary(): Resume prompt shows progress → 100% critical path
   - stateDeletedOnCompletion(): State file removed after success → 100% critical path
   - **Coverage Target**: 100%

**Overall**: 88%

**Implementation**:
1. Verify `src/core/repo-structure/setup-state-manager.ts` exists (180 lines, 85% coverage)
2. Verify integration in `repo-structure-manager.ts`:
   - Constructor (line 70): `this.stateManager = new SetupStateManager(projectPath)`
   - Resume detection (lines 81-100)
   - State saving after each step (lines 304-312, 388-397, 504-521)
   - State deletion (line 697)
3. Enhance resume detection UI (lines 81-100):
   - Show more detailed progress ("Parent: ✓, Repos: 1/2 completed")
   - Validate state completeness
   - Handle corruption gracefully
4. Test Ctrl+C recovery:
   - Start setup → Ctrl+C → restart → verify resume prompt
5. Run unit tests: `npm test -- setup-state-manager` (should pass: 18/18)
6. Run integration tests: `npm run test:integration -- ctrl-c-recovery` (should pass: 7/7)
7. Run E2E tests: `npm run test:e2e -- resume-setup` (should pass: 3/3)

**TDD Workflow**:
1. 📝 Write all tests above (should mostly pass if module complete)
2. ❌ Run tests: `npm test` (check current state)
3. ✅ Enhance resume detection UI
4. 🟢 Run tests: `npm test` (28/28 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

**Dependencies**: None

---

### T-005: Integrate GitHub validation before creation

**AC**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05

**Priority**: P1
**Estimate**: 4 hours
**Status**: [x] completed

**Test Plan** (BDD format):
- **Given** user enters repository name during setup
- **When** system validates via GitHub API
- **Then** repository existence should be checked (404 = OK, 200 = exists)
- **And** owner/org existence should be validated
- **And** clear error shown if repo exists ("Repository already exists at [URL]")
- **And** option to use existing repo offered

**Test Cases**:
1. **Unit** (`tests/unit/repo-structure/github-validator.test.ts`):
   - testValidateRepository(): Test repo existence check → 92% coverage
   - testValidateOwner(): Test owner/org validation → 92% coverage
   - testRetryLogic(): Verify exponential backoff → 90% coverage
   - testRateLimitCheck(): Test rate limit monitoring → 88% coverage
   - testErrorHandling(): Test API error responses → 88% coverage
   - **Coverage Target**: 90%

2. **Integration** (`tests/integration/repo-structure/github-validation.test.ts`):
   - testValidationFlow(): Complete validation workflow → 87% coverage
   - testExistingRepoPrompt(): Offer to use existing repo → 87% coverage
   - testInvalidOwnerError(): Handle non-existent owner → 85% coverage
   - testNetworkRetry(): Test retry on network error → 85% coverage
   - **Coverage Target**: 86%

3. **E2E** (`tests/e2e/init/github-validation.spec.ts`):
   - userSeesExistingRepoError(): Error shown for duplicate repo → 100% critical path
   - userOfferedUseExisting(): Option to use existing repo → 100% critical path
   - userSeesInvalidOwnerError(): Clear message for invalid owner → 100% critical path
   - **Coverage Target**: 100%

**Overall**: 89%

**Implementation**:
1. Verify `src/core/repo-structure/github-validator.ts` exists (200 lines, 90% coverage)
2. Verify integration in `repo-structure-manager.ts`:
   - Owner validation (lines 320-332)
   - Repo validation (lines 434-448)
3. Test validation scenarios:
   - Valid repo (doesn't exist): Pass
   - Repo exists: Show error with URL
   - Invalid owner: Show error
   - Network error: Retry 3 times
4. Run unit tests: `npm test -- github-validator` (should pass: 15/15)
5. Run integration tests: `npm run test:integration -- github-validation` (should pass: 8/8)
6. Run E2E tests: `npm run test:e2e -- github-validation` (should pass: 3/3)

**TDD Workflow**:
1. 📝 Write all tests above (should mostly pass if module complete)
2. ❌ Run tests: `npm test` (check current state)
3. ✅ Enhance any missing functionality
4. 🟢 Run tests: `npm test` (26/26 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥89%

**Dependencies**: Requires GitHub token (GITHUB_TOKEN env var)

---

## Phase 3: Bulk Visibility Prompt (Day 4)

### T-006: Add private/public visibility prompt

**AC**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04

**Priority**: P1
**Estimate**: 3 hours
**Status**: [x] completed

**Test Plan** (BDD format):
- **Given** user configures repository during setup
- **When** prompted for visibility
- **Then** "Private" should be default (security)
- **And** choice should be stored in configuration
- **And** visibility should be passed to GitHub API on creation

**Test Cases**:
1. **Unit** (`tests/unit/repo-structure/visibility-prompt.test.ts`):
   - testVisibilityDefault(): Verify "Private" is default → 90% coverage
   - testVisibilityOptions(): Test available options → 90% coverage
   - testVisibilityStorage(): Verify storage in config → 88% coverage
   - testGitHubAPICall(): Verify visibility in API payload → 88% coverage
   - **Coverage Target**: 89%

2. **Integration** (`tests/integration/repo-structure/visibility-flow.test.ts`):
   - testVisibilityPromptFlow(): Complete visibility workflow → 87% coverage
   - testBulkVisibilityChoice(): Apply same visibility to all repos → 87% coverage
   - testMixedVisibility(): Different visibility per repo → 85% coverage
   - **Coverage Target**: 86%

3. **E2E** (`tests/e2e/init/visibility-prompt.spec.ts`):
   - userSeesVisibilityPrompt(): Prompt shown for each repo → 100% critical path
   - privateIsDefault(): "Private" pre-selected → 100% critical path
   - visibilityAppliedToGitHub(): Created repos have correct visibility → 100% critical path
   - **Coverage Target**: 100%

**Overall**: 88%

**Implementation**:
1. Verify `src/core/repo-structure/prompt-consolidator.ts` has:
   - `getVisibilityPrompt(repoName)` function (lines 100-120)
   - Returns: question, options, default: 'private'
2. Verify integration in `repo-structure-manager.ts`:
   - Single repo (lines 257-268)
   - Parent repo (lines 367-378)
   - Implementation repos (lines 479-490)
   - Monorepo (lines 585-596)
3. Add bulk visibility option (optional enhancement):
   - After repo count prompt, ask: "Apply same visibility to all repos?"
   - If yes, prompt once and apply to all
   - If no, prompt per repo
4. Verify GitHub API receives visibility (line 804):
   - `private: visibility === 'private'`
5. Run unit tests: `npm test -- visibility-prompt` (should pass: 10/10)
6. Run integration tests: `npm run test:integration -- visibility-flow` (should pass: 6/6)
7. Run E2E tests: `npm run test:e2e -- visibility-prompt` (should pass: 3/3)

**TDD Workflow**:
1. 📝 Write all tests above (should mostly pass if module complete)
2. ❌ Run tests: `npm test` (check current state)
3. ✅ Add bulk visibility option (optional)
4. 🟢 Run tests: `npm test` (19/19 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

**Dependencies**: None

---

### T-007: Integrate .env file generation

**AC**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06

**Priority**: P1
**Estimate**: 3 hours
**Status**: [x] completed

**Test Plan** (BDD format):
- **Given** all repositories created successfully
- **When** .env generation runs
- **Then** .env file should be created with GitHub token, owner, repos mapping
- **And** .env should be added to .gitignore
- **And** .env.example should be created (without token)
- **And** file permissions should be 0600 (secure)

**Test Cases**:
1. **Unit** (`tests/unit/utils/env-file-generator.test.ts`):
   - testGenerateEnvFile(): Test .env content generation → 92% coverage
   - testEnvExampleCreation(): Verify .env.example created → 90% coverage
   - testGitignoreUpdate(): Test .gitignore updates → 90% coverage
   - testFilePermissions(): Verify 0600 permissions → 88% coverage
   - testMultiProviderSupport(): Test GitHub/JIRA/ADO → 88% coverage
   - **Coverage Target**: 90%

2. **Integration** (`tests/integration/repo-structure/env-generation.test.ts`):
   - testCompleteEnvGeneration(): Full .env workflow → 87% coverage
   - testExistingEnvOverwrite(): Handle existing .env → 87% coverage
   - testMultiRepoMapping(): Verify repo mappings → 85% coverage
   - **Coverage Target**: 86%

3. **E2E** (`tests/e2e/init/env-file-creation.spec.ts`):
   - userSeesEnvFileCreated(): .env file present → 100% critical path
   - envContainsGitHubConfig(): Valid GitHub config in .env → 100% critical path
   - envExampleIsSafe(): .env.example has no secrets → 100% critical path
   - **Coverage Target**: 100%

**Overall**: 89%

**Implementation**:
1. Verify `src/utils/env-file-generator.ts` exists (150 lines, 85% coverage)
2. Verify integration in `repo-structure-manager.ts` (lines 691-747):
   - Called after repo creation
   - State saved after env creation
3. Test .env content:
   ```bash
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
   GITHUB_OWNER=myorg
   GITHUB_REPOS=parent:my-project-parent,frontend:my-project-frontend
   GITHUB_SYNC_ENABLED=true
   ```
4. Verify .env.example excludes token
5. Verify .gitignore includes .env pattern
6. Run unit tests: `npm test -- env-file-generator` (should pass: 12/12)
7. Run integration tests: `npm run test:integration -- env-generation` (should pass: 6/6)
8. Run E2E tests: `npm run test:e2e -- env-file-creation` (should pass: 3/3)

**TDD Workflow**:
1. 📝 Write all tests above (should mostly pass if module complete)
2. ❌ Run tests: `npm test` (check current state)
3. ✅ Enhance any missing functionality
4. 🟢 Run tests: `npm test` (21/21 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥89%

**Dependencies**: T-004 (state management)

---

### T-008: Integrate comprehensive summary generation

**AC**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04, AC-US8-05

**Priority**: P1
**Estimate**: 3 hours
**Status**: [x] completed

**Test Plan** (BDD format):
- **Given** setup completed successfully
- **When** summary is generated
- **Then** detailed summary should show created repos with URLs
- **And** folder structure should be displayed (ASCII tree)
- **And** .env location should be highlighted
- **And** next steps should be provided (npm install, /specweave:increment)
- **And** estimated time saved should be calculated (~13 minutes)

**Test Cases**:
1. **Unit** (`tests/unit/repo-structure/setup-summary.test.ts`):
   - testGenerateSetupSummary(): Test summary content → 90% coverage
   - testReposSummary(): Verify repo list with URLs → 90% coverage
   - testFolderStructure(): Test ASCII tree generation → 88% coverage
   - testNextSteps(): Verify command list → 88% coverage
   - testTimeSaved(): Test time calculation → 85% coverage
   - **Coverage Target**: 88%

2. **Integration** (`tests/integration/repo-structure/summary-generation.test.ts`):
   - testCompleteSummaryGeneration(): Full summary workflow → 87% coverage
   - testSummaryFormatting(): Verify Markdown formatting → 85% coverage
   - testMultiRepoSummary(): Test with multiple repos → 85% coverage
   - **Coverage Target**: 86%

3. **E2E** (`tests/e2e/init/setup-summary.spec.ts`):
   - userSeesCompleteSummary(): Summary displayed at end → 100% critical path
   - summaryIncludesAllRepos(): All repo URLs present → 100% critical path
   - summaryShowsNextSteps(): Installation commands visible → 100% critical path
   - **Coverage Target**: 100%

**Overall**: 88%

**Implementation**:
1. Verify `src/core/repo-structure/setup-summary.ts` exists (120 lines, 80% coverage)
2. Verify integration in `repo-structure-manager.ts` (lines 752-782):
   - Called after .env generation
   - State file deleted after summary
3. Test summary output:
   ```
   ✅ Setup Complete!

   📦 Created Repositories (3 total):
      1. Parent: https://github.com/myorg/my-project-parent
      2. Frontend: https://github.com/myorg/my-project-frontend
      3. Backend: https://github.com/myorg/my-project-backend

   📁 Folder Structure:
      my-project/
      ├── .specweave/
      ├── .env
      ├── frontend/
      └── backend/

   ⏱️  Time Saved: ~13 minutes
   ```
4. Run unit tests: `npm test -- setup-summary` (should pass: 10/10)
5. Run integration tests: `npm run test:integration -- summary-generation` (should pass: 5/5)
6. Run E2E tests: `npm run test:e2e -- setup-summary` (should pass: 3/3)

**TDD Workflow**:
1. 📝 Write all tests above (should mostly pass if module complete)
2. ❌ Run tests: `npm test` (check current state)
3. ✅ Enhance any missing functionality
4. 🟢 Run tests: `npm test` (18/18 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥88%

**Dependencies**: T-007 (.env generation)

---

### T-009: Improve parent folder benefits explanation

**AC**: AC-US9-01, AC-US9-02, AC-US9-03

**Priority**: P1
**Estimate**: 2 hours
**Status**: [x] completed

**Test Plan** (BDD format):
- **Given** user selects multi-repo with parent option
- **When** parent benefits explanation is shown
- **Then** detailed benefits should be listed (central .specweave/, cross-cutting features, etc.)
- **And** visual comparison should show with vs without parent
- **And** link to documentation should be included

**Test Cases**:
1. **Unit** (`tests/unit/repo-structure/parent-benefits.test.ts`):
   - testParentBenefitsContent(): Verify benefits list → 88% coverage
   - testVisualComparison(): Test comparison text → 85% coverage
   - testDocumentationLink(): Verify link present → 85% coverage
   - **Coverage Target**: 86%

2. **Integration** (`tests/integration/repo-structure/parent-benefits-display.test.ts`):
   - testBenefitsShownDuringSetup(): Benefits displayed at correct time → 85% coverage
   - testBenefitsReadability(): Verify formatting and clarity → 83% coverage
   - **Coverage Target**: 84%

**Overall**: 85%

**Implementation**:
1. Verify `src/core/repo-structure/prompt-consolidator.ts` has:
   - `getParentRepoBenefits()` function (lines 60-80)
   - Returns detailed benefits text
2. Verify integration in `repo-structure-manager.ts` (line 294):
   - Called when `useParent === true`
3. Expand benefits text to include:
   - Central .specweave/ for all specs/docs
   - Cross-cutting features (auth spans frontend + backend)
   - System-wide ADRs
   - Onboarding new developers
   - Compliance & auditing
4. Add visual comparison (with parent vs without)
5. Add link to: https://spec-weave.com/docs/guides/multi-repo-setup
6. Run unit tests: `npm test -- parent-benefits` (should pass: 6/6)
7. Run integration tests: `npm run test:integration -- parent-benefits-display` (should pass: 4/4)
8. Manually verify readability and clarity

**TDD Workflow**:
1. 📝 Write all tests above (should mostly pass if module complete)
2. ❌ Run tests: `npm test` (check current state)
3. ✅ Enhance benefits explanation
4. 🟢 Run tests: `npm test` (10/10 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

**Dependencies**: None

---

## Phase 4: E2E Testing (Days 5-6)

### T-010: E2E test - Happy path (single repo)

**AC**: All US-001 through US-009 (single repo variant)

**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** user runs `specweave init my-project`
- **When** selecting single repository architecture
- **Then** complete flow should work end-to-end
- **And** repository should be created on GitHub
- **And** .env file should be generated
- **And** summary should be shown
- **And** state file should be deleted

**Test Cases**:
- **E2E** (`tests/e2e/init/single-repo-happy-path.spec.ts`):
  - testSingleRepoCompleteFlow(): Full single repo setup → 100% critical path
  - testGitHubRepoCreated(): Verify GitHub repo exists → 100% critical path
  - testEnvFilePresent(): Verify .env created → 100% critical path
  - testSummaryDisplayed(): Verify summary shown → 100% critical path
  - testStateFileDeleted(): Verify cleanup → 100% critical path
  - **Coverage Target**: 100%

**Overall**: 100%

**Implementation**:
1. Create `tests/e2e/init/single-repo-happy-path.spec.ts`
2. Test scenario:
   - Run: `specweave init test-single-repo`
   - Select: "Single repository"
   - Enter: owner, repo name, description
   - Select: Private visibility
   - Confirm: Create on GitHub
   - Wait for: Completion
   - Verify: GitHub repo, .env file, summary, no state file
3. Mock GitHub API or use test account
4. Clean up test resources after run
5. Run E2E test: `npm run test:e2e -- single-repo-happy-path` (should pass: 5/5)

**TDD Workflow**:
1. 📝 Write all E2E tests above
2. ❌ Run tests: `npm run test:e2e` (0/5 passing)
3. ✅ Verify all components integrated
4. 🟢 Run tests: `npm run test:e2e` (5/5 passing)
5. ✅ Final check: 100% critical path

**Dependencies**: All T-001 through T-009

---

### T-011: E2E test - Multi-repo with validation

**AC**: US-004 (validation), US-007 (recovery)

**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** user runs multi-repo setup
- **When** entering repository names
- **Then** GitHub validation should prevent duplicate repos
- **And** Ctrl+C recovery should work
- **And** all 3 repos should be created successfully

**Test Cases**:
- **E2E** (`tests/e2e/init/multi-repo-validation.spec.ts`):
  - testMultiRepoWithValidation(): Full multi-repo with validation → 100% critical path
  - testDuplicateRepoDetected(): Validation prevents duplicate → 100% critical path
  - testCtrlCRecovery(): Resume after Ctrl+C → 100% critical path
  - testAllReposCreated(): Verify all repos exist → 100% critical path
  - **Coverage Target**: 100%

**Overall**: 100%

**Implementation**:
1. Create `tests/e2e/init/multi-repo-validation.spec.ts`
2. Test scenarios:
   - Scenario 1: Create 3 repos successfully
   - Scenario 2: Enter existing repo name → see error → correct it
   - Scenario 3: Start setup → Ctrl+C after repo 1 → restart → resume → complete
3. Mock GitHub API for validation
4. Test state file creation and deletion
5. Clean up test resources
6. Run E2E test: `npm run test:e2e -- multi-repo-validation` (should pass: 4/4)

**TDD Workflow**:
1. 📝 Write all E2E tests above
2. ❌ Run tests: `npm run test:e2e` (0/4 passing)
3. ✅ Verify all components integrated
4. 🟢 Run tests: `npm run test:e2e` (4/4 passing)
5. ✅ Final check: 100% critical path

**Dependencies**: T-004 (state management), T-005 (validation)

---

### T-012: E2E test - Error scenarios

**AC**: All error handling ACs

**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** various error conditions
- **When** setup encounters errors
- **Then** clear error messages should be shown
- **And** user should be able to recover
- **And** system should remain stable

**Test Cases**:
- **E2E** (`tests/e2e/init/error-handling.spec.ts`):
  - testInvalidOwnerError(): Handle non-existent owner → 100% error path
  - testGitHubAPIFailure(): Handle API failures gracefully → 100% error path
  - testStateCorruption(): Recover from corrupt state file → 100% error path
  - testNetworkError(): Handle network failures with retry → 100% error path
  - **Coverage Target**: 100%

**Overall**: 100%

**Implementation**:
1. Create `tests/e2e/init/error-handling.spec.ts`
2. Test error scenarios:
   - Invalid owner: Enter "nonexistent-org-12345" → see error
   - GitHub API failure: Mock 500 error → see retry → see error
   - State corruption: Corrupt state file → detect → offer fresh start
   - Network error: Mock network failure → see retry → success
3. Mock GitHub API with error responses
4. Test error messages for clarity
5. Verify recovery mechanisms work
6. Run E2E test: `npm run test:e2e -- error-handling` (should pass: 4/4)

**TDD Workflow**:
1. 📝 Write all E2E tests above
2. ❌ Run tests: `npm run test:e2e` (0/4 passing)
3. ✅ Verify error handling works
4. 🟢 Run tests: `npm run test:e2e` (4/4 passing)
5. ✅ Final check: 100% error paths

**Dependencies**: T-004 (state management), T-005 (validation)

---

## Phase 5: Documentation (Day 7)

### T-013: Update user documentation

**AC**: All US documentation requirements

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Link checker: All links work (`npm run check-links`)
- Build check: Docusaurus builds without errors (`npm run build:docs`)
- Code examples: All code snippets are valid and tested

**Implementation**:
1. Update `docs-site/docs/guides/multi-repo-setup.md`:
   - Add section on auto-ID generation
   - Document visibility options
   - Explain Ctrl+C recovery
   - Add examples with new prompts
2. Update `docs-site/docs/guides/getting-started.md`:
   - Update screenshots with new prompts
   - Add troubleshooting section
3. Update `.specweave/docs/public/guides/`:
   - Multi-repo setup guide
   - Troubleshooting guide
4. Add examples:
   - Happy path setup
   - Error recovery
   - Multi-repo with parent
5. Run link checker: `npm run check-links`
6. Build docs: `npm run build:docs` (should succeed)
7. Preview docs: `npm run serve:docs` (manual check)

**Dependencies**: T-001 through T-012 (all features implemented)

---

### T-014: Create ADRs

**AC**: All architecture decisions

**Priority**: P1
**Estimate**: 4 hours
**Status**: [x] completed

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Clear rationale, alternatives considered
- Consistency: ADR format matches existing ADRs
- Completeness: All decisions documented

**Implementation**:
1. Create `ADR-0023: Auto-ID Generation Algorithm`:
   - Location: `.specweave/docs/internal/architecture/adr/0023-auto-id-generation-algorithm.md`
   - Content: Algorithm, rationale, alternatives, consequences
2. Create `ADR-0024: Root-Level Repository Structure`:
   - Location: `.specweave/docs/internal/architecture/adr/0024-root-level-repository-structure.md`
   - Content: Decision, why root-level, alternatives, migration
3. Create `ADR-0025: Incremental State Persistence`:
   - Location: `.specweave/docs/internal/architecture/adr/0025-incremental-state-persistence.md`
   - Content: JSON file approach, atomic writes, recovery
4. Create `ADR-0026: GitHub Validation Strategy`:
   - Location: `.specweave/docs/internal/architecture/adr/0026-github-validation-strategy.md`
   - Content: Pre-creation validation, retry logic, error handling
5. Create `ADR-0027: .env File Structure`:
   - Location: `.specweave/docs/internal/architecture/adr/0027-env-file-structure.md`
   - Content: Why .env, security measures, .env.example
6. Verify ADR format matches existing ADRs (ADR-0001 through ADR-0022)
7. Link ADRs from plan.md and spec.md

**Dependencies**: T-001 through T-012 (all features implemented)

---

### T-015: Update CHANGELOG.md

**AC**: Version history

**Priority**: P1
**Estimate**: 1 hour
**Status**: [x] completed

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Clear, concise, follows keep-a-changelog format
- Completeness: All user-facing changes documented
- Links: GitHub issue links work

**Implementation**:
1. Open `CHANGELOG.md`
2. Add new section for version (e.g., v0.X.Y):
   ```markdown
   ## [0.X.Y] - 2025-11-XX

   ### Added
   - Auto-generated repository IDs from names (US-002)
   - Ctrl+C recovery with incremental state persistence (US-007)
   - GitHub validation before repository creation (US-004)
   - Private/public visibility prompts (US-003)
   - Comprehensive setup summary with time saved (US-008)
   - .env file auto-generation with GitHub config (US-006)

   ### Changed
   - Repositories now cloned at root level (not services/) (US-005)
   - Simplified repository architecture questions (US-001)
   - Improved parent folder benefits explanation (US-009)

   ### Fixed
   - Duplicate repository prevention
   - State corruption recovery
   - Network error retry logic
   ```
3. Add link to GitHub milestone/project
4. Add migration guide link
5. Verify format matches previous entries
6. Commit: `git commit -m "docs: update changelog for v0.X.Y"`

**Dependencies**: T-013 (user documentation), T-014 (ADRs)

---

## AC-ID Coverage Matrix

| Task | AC-IDs Covered |
|------|---------------|
| T-001 | AC-US5-01, AC-US5-03 |
| T-002 | AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04 |
| T-003 | AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04 |
| T-004 | AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05, AC-US7-06 |
| T-005 | AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05 |
| T-006 | AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04 |
| T-007 | AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06 |
| T-008 | AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04, AC-US8-05 |
| T-009 | AC-US9-01, AC-US9-02, AC-US9-03 |
| T-010 | All (single repo variant) |
| T-011 | US-004, US-007 (E2E validation) |
| T-012 | All error handling ACs |
| T-013 | Documentation ACs |
| T-014 | Architecture decisions |
| T-015 | Version history |

**Total ACs Covered**: 38 unique acceptance criteria across 9 user stories

---

## Dependencies Graph

```
Foundation:
T-001 (root-level cloning) → T-002, T-003, T-004, T-005, T-006, T-007, T-008, T-009

Core Features:
T-002 (prompts) → T-010, T-011, T-012
T-003 (auto-ID) → T-010, T-011, T-012
T-004 (state mgmt) → T-007, T-008, T-011, T-012
T-005 (validation) → T-010, T-011, T-012
T-006 (visibility) → T-010, T-011, T-012

Integration:
T-007 (.env) → T-008, T-010, T-011, T-012
T-008 (summary) → T-010, T-011, T-012
T-009 (benefits) → T-010, T-011, T-012

E2E Testing:
T-001 through T-009 → T-010, T-011, T-012

Documentation:
T-001 through T-012 → T-013, T-014, T-015
```

---

## Summary

**Total Tasks**: 15
**Estimated Time**: 7 days
**Test Coverage Target**: 85% overall (90% for critical paths)

**Key Architectural Insight**: Most utility modules ALREADY EXIST (6/6 complete), so implementation focuses on:
1. Root-level cloning verification (2 lines)
2. Enhanced UX (prompts, summaries, benefits)
3. E2E testing (validation)
4. Documentation (ADRs, guides)

**Expected Impact**:
- 60% faster setup (20min → 8min)
- 90% fewer errors (10% → 1%)
- 95% first-run success (vs 40%)
- Zero confusion support tickets

**Test Mode**: TDD (Test-Driven Development)
- Write tests FIRST for each task
- Red → Green → Refactor cycle
- Comprehensive E2E coverage for critical paths
