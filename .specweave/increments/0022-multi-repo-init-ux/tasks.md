---
increment: 0022-multi-repo-init-ux
total_tasks: 24
completed_tasks: 2
test_mode: TDD
coverage_target: 85%
---

# Implementation Tasks

## Phase 1: Core Modules (T-001 to T-006)

### T-001: Implement Repository ID Generator

**AC**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04

**Priority**: P1
**Estimate**: 3 hours
**Status**: [x] completed
**Completed**: 2025-11-11
**Coverage**: 97.29% (Target: 90%, EXCEEDED ✅)

**Test Plan** (BDD format):
- **Given** repo name "my-saas-frontend-app" → **When** generateRepoId() called → **Then** returns "frontend"
- **Given** repo name "acme-api-gateway-service" → **When** generateRepoId() called → **Then** returns "gateway"
- **Given** repo name "backend-service" → **When** generateRepoId() called → **Then** returns "backend"
- **Given** duplicate ID "frontend" exists in set → **When** ensureUniqueId("frontend") called → **Then** returns "frontend-2"
- **Given** invalid input "parent,fe,be" (contains comma) → **When** validateRepoId() called → **Then** throws validation error with message "Repository ID cannot contain commas"
- **Given** invalid input "My-Repo" (uppercase) → **When** validateRepoId() called → **Then** throws validation error
- **Given** valid input "frontend-app" → **When** validateRepoId() called → **Then** returns { valid: true }

**Test Cases**:

1. **Unit**: `tests/unit/repo-structure/repo-id-generator.test.ts` (15 test cases)
   - generateRepoId_stripsAppSuffix(): "my-app" → "my"
   - generateRepoId_stripsServiceSuffix(): "backend-service" → "backend"
   - generateRepoId_stripsApiSuffix(): "api-gateway-api" → "gateway"
   - generateRepoId_stripsFrontendSuffix(): "my-frontend" → "my"
   - generateRepoId_stripsBackendSuffix(): "my-backend" → "my"
   - generateRepoId_takesLastSegment(): "acme-saas-mobile" → "mobile"
   - generateRepoId_handlesMultipleSuffixes(): "my-frontend-app" → "frontend"
   - generateRepoId_handlesNoSuffix(): "simple-name" → "name"
   - ensureUniqueId_noDuplicate(): "frontend" + {} → "frontend" (wasModified: false)
   - ensureUniqueId_oneDuplicate(): "frontend" + {"frontend"} → "frontend-2" (wasModified: true)
   - ensureUniqueId_multipleDuplicates(): "frontend" + {"frontend", "frontend-2"} → "frontend-3"
   - validateRepoId_rejectsCommas(): "parent,fe,be" → error
   - validateRepoId_rejectsUppercase(): "MyRepo" → error
   - validateRepoId_rejectsSpaces(): "my repo" → error
   - validateRepoId_acceptsValidId(): "frontend-app" → valid
   - **Coverage Target**: 90%

**Implementation**:

1. Create file: `src/core/repo-structure/repo-id-generator.ts` (~50 lines)
2. Implement generateRepoId() algorithm:
   - Define suffix list: ['-app', '-service', '-api', '-frontend', '-backend', '-web', '-mobile']
   - Strip one suffix from end (if exists)
   - Split by hyphen, take last segment
   - Convert to lowercase
3. Implement ensureUniqueId() with numeric suffix logic
4. Implement validateRepoId() with rules:
   - No commas (prevents "parent,fe,be" input)
   - Lowercase + hyphens only (alphanumeric)
   - Length 1-50 chars
5. Write 15 unit tests with TDD (red → green → refactor)
6. Run tests: `npm test repo-id-generator.test.ts` (should pass: 15/15)
7. Verify coverage: `npm run coverage -- --include=src/core/repo-structure/repo-id-generator.ts` (≥90%)

**TDD Workflow**:
1. 📝 Write all 15 tests above (should fail)
2. ❌ Run tests: `npm test repo-id-generator.test.ts` (0/15 passing)
3. ✅ Implement generateRepoId() (step-by-step)
4. 🟢 Run tests: `npm test repo-id-generator.test.ts` (15/15 passing)
5. ♻️ Refactor: Extract suffix list to constant, optimize string operations
6. ✅ Final check: Coverage ≥90%

**Dependencies**: None

---

### T-002: Implement Setup State Manager

**AC**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04

**Priority**: P1
**Estimate**: 6 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** new setup state → **When** saveState() called → **Then** file created at `.specweave/setup-state.json` with permissions 0600
- **Given** existing state file → **When** saveState() called → **Then** backup created, temp file written, atomic rename performed
- **Given** write failure during save → **When** saveState() fails → **Then** backup restored, original state preserved
- **Given** valid state file exists → **When** loadState() called → **Then** state parsed and validated
- **Given** corrupted state file → **When** loadState() called → **Then** backup loaded successfully
- **Given** incomplete setup (parentRepo created) → **When** detectAndResumeSetup() called → **Then** returns true, prompts user with "1/3 repos completed"
- **Given** successful setup completion → **When** deleteState() called → **Then** state file and backup deleted

**Test Cases**:

1. **Unit**: `tests/unit/repo-structure/setup-state-manager.test.ts` (20 test cases)
   - saveState_createsNewFile(): First save creates file
   - saveState_setsPermissions0600(): File has correct permissions
   - saveState_createsBackup(): Backup file created before write
   - saveState_atomicRename(): Temp → rename operation
   - saveState_restoresOnFailure(): Write fails → backup restored
   - loadState_validFile(): Returns parsed state
   - loadState_validateSchema(): Invalid schema → error
   - loadState_corruptedFile(): Loads from backup
   - loadState_missingFile(): Returns null
   - detectAndResumeSetup_incompleteSetup(): Returns true + shows progress
   - detectAndResumeSetup_noStateFile(): Returns false
   - detectAndResumeSetup_completeSetup(): Returns false
   - deleteState_removesFiles(): State + backup deleted
   - deleteState_handlesNonexistent(): No error if files missing
   - resumeSetup_continuesFromStep(): Skips completed repos
   - resumeSetup_preservesConfig(): Configuration unchanged
   - stateValidation_checksVersion(): Rejects old version
   - stateValidation_checksRepos(): Validates repo structure
   - concurrentWrites_preventCorruption(): Multiple saves → consistent state
   - permissionsCheck_failsIfWrong(): Detects permission changes
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/repo-structure/ctrl-c-recovery.test.ts` (10 test cases)
   - fullRecoveryFlow_afterParent(): Ctrl+C after parent → resume successful
   - fullRecoveryFlow_afterRepo1(): Ctrl+C after repo 1 → resume successful
   - fullRecoveryFlow_multipleInterrupts(): Multiple Ctrl+C → eventual success
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:

1. Create file: `src/core/repo-structure/setup-state-manager.ts` (~200 lines)
2. Define SetupState interface (version, architecture, parentRepo, repos, currentStep, timestamp)
3. Implement SetupStateManager class:
   - constructor(projectRoot): Initialize paths
   - saveState(state): Atomic write with backup
   - loadState(): Load + validate + fallback to backup
   - detectAndResumeSetup(): Check existence, prompt user
   - deleteState(): Clean up state + backup
   - validateState(state): Schema validation
4. Implement atomic file operations:
   - Create backup: fs.copyFile(statePath, backupPath)
   - Write to temp: fs.writeFile(tempPath, JSON.stringify(state), { mode: 0o600 })
   - Atomic rename: fs.rename(tempPath, statePath)
   - Restore on error: fs.copyFile(backupPath, statePath)
5. Add error handling for corruption, missing files, permission issues
6. Write 20 unit tests + 10 integration tests with TDD
7. Run tests: `npm test setup-state-manager.test.ts` (should pass: 20/20)
8. Run integration tests: `npm test ctrl-c-recovery.test.ts` (should pass: 10/10)
9. Verify coverage ≥88%

**TDD Workflow**:
1. 📝 Write all 30 tests above (should fail)
2. ❌ Run tests: `npm test setup-state-manager` (0/30 passing)
3. ✅ Implement saveState() with atomic writes (step-by-step)
4. 🟢 Run tests: `npm test` (5/30 passing)
5. ✅ Implement loadState() with validation
6. 🟢 Run tests: `npm test` (15/30 passing)
7. ✅ Implement detectAndResumeSetup() with prompts
8. 🟢 Run tests: `npm test` (30/30 passing)
9. ♻️ Refactor: Extract backup logic, improve error messages
10. ✅ Final check: Coverage ≥88%

**Dependencies**: None

---

### T-003: Implement GitHub Validator

**AC**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04

**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** repo "myorg/my-project" does not exist (404) → **When** validateRepository() called → **Then** returns { exists: false, valid: true }
- **Given** repo "myorg/my-project" exists (200) → **When** validateRepository() called → **Then** returns { exists: true, valid: true, url: "https://github.com/myorg/my-project" }
- **Given** invalid token (401) → **When** validateRepository() called → **Then** returns { exists: false, valid: false, error: "Invalid GitHub token" }
- **Given** owner "myorg" exists as user → **When** validateOwner() called → **Then** returns { valid: true, type: "user" }
- **Given** owner "myorg" exists as org → **When** validateOwner() called → **Then** returns { valid: true, type: "org" }
- **Given** owner "nonexistent-org-12345" not found (404) → **When** validateOwner() called → **Then** returns { valid: false, error: "Owner not found" }
- **Given** network failure (fetch throws) → **When** validateWithRetry() called → **Then** retries 3 times with exponential backoff, eventually throws
- **Given** rate limit exceeded (403) → **When** checkRateLimit() called → **Then** returns { remaining: 0, resetAt: timestamp }

**Test Cases**:

1. **Unit**: `tests/unit/repo-structure/github-validator.test.ts` (25 test cases)
   - validateRepository_doesNotExist(): 404 → exists: false
   - validateRepository_exists(): 200 → exists: true + URL
   - validateRepository_invalidToken(): 401 → error
   - validateRepository_forbidden(): 403 → error
   - validateRepository_rateLimitExceeded(): 403 X-RateLimit → error
   - validateRepository_networkError(): Fetch fails → error
   - validateOwner_existsAsUser(): GET /users/{owner} 200 → user
   - validateOwner_existsAsOrg(): GET /orgs/{owner} 200 → org
   - validateOwner_notFound(): Both 404 → error
   - validateOwner_networkError(): Fetch fails → error
   - validateWithRetry_succeedsFirstAttempt(): No retry needed
   - validateWithRetry_succeedsSecondAttempt(): 1 retry
   - validateWithRetry_succeedsThirdAttempt(): 2 retries
   - validateWithRetry_failsAfter3Attempts(): All retries fail → throw
   - validateWithRetry_exponentialBackoff(): 100ms, 200ms, 400ms delays
   - checkRateLimit_hasRemaining(): remaining: 4999
   - checkRateLimit_noRemaining(): remaining: 0, resetAt: timestamp
   - checkRateLimit_networkError(): Fetch fails → default values
   - parseErrorResponse_401(): "Invalid token or permissions"
   - parseErrorResponse_403_rateLimit(): "Rate limit exceeded"
   - parseErrorResponse_404(): "Not found"
   - parseErrorResponse_500(): "GitHub API error: 500"
   - parseErrorResponse_networkError(): "Network error: ..."
   - validateRepositoryWithAuth_validToken(): Success
   - validateRepositoryWithAuth_noToken(): Error
   - **Coverage Target**: 85%

2. **Integration**: `tests/integration/repo-structure/github-validation.test.ts` (10 test cases)
   - realGitHubAPI_validateExistingRepo(): Check real public repo
   - realGitHubAPI_validateNonexistentRepo(): Check random name
   - realGitHubAPI_validateOwner(): Check real user/org
   - mockGitHubAPI_fullValidationFlow(): End-to-end with nock
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:

1. Create file: `src/core/repo-structure/github-validator.ts` (~150 lines)
2. Define GitHubValidator class:
   - constructor(token): Store GitHub token
   - validateRepository(owner, repo): Check existence via GitHub API
   - validateOwner(owner): Check user/org existence
   - validateWithRetry(fn, maxRetries): Retry logic with exponential backoff
   - checkRateLimit(): GET /rate_limit
   - parseErrorResponse(response): Extract error message
3. Implement API calls:
   - GET /repos/{owner}/{repo} (check repo)
   - GET /users/{owner} (check user)
   - GET /orgs/{owner} (check org)
   - GET /rate_limit (check rate limit)
4. Implement retry logic:
   - Exponential backoff: 100ms, 200ms, 400ms
   - Max 3 attempts
   - Only retry on network errors (not 401/403)
5. Add error handling for all scenarios
6. Write 25 unit tests + 10 integration tests (with nock mocking)
7. Run tests: `npm test github-validator.test.ts` (should pass: 25/25)
8. Run integration tests: `npm test github-validation.test.ts` (should pass: 10/10)
9. Verify coverage ≥85%

**TDD Workflow**:
1. 📝 Write all 35 tests above (should fail)
2. ❌ Run tests: `npm test github-validator` (0/35 passing)
3. ✅ Implement validateRepository() with API calls
4. 🟢 Run tests: `npm test` (10/35 passing)
5. ✅ Implement validateOwner() with user/org logic
6. 🟢 Run tests: `npm test` (20/35 passing)
7. ✅ Implement retry logic with exponential backoff
8. 🟢 Run tests: `npm test` (35/35 passing)
9. ♻️ Refactor: Extract API URL constants, improve error messages
10. ✅ Final check: Coverage ≥85%

**Dependencies**: None

---

### T-004: Implement .env File Generator

**AC**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04

**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** GitHub config (token, owner, repos) → **When** generateEnvFile() called → **Then** .env created with correct format and permissions 0600
- **Given** existing .env file → **When** generateEnvFile() called → **Then** prompts for overwrite, creates backup if yes
- **Given** .env generation → **When** complete → **Then** .env.example created without secrets
- **Given** .gitignore exists without .env → **When** ensureGitignoreIncludes(['.env']) called → **Then** .env pattern added
- **Given** .gitignore exists with .env → **When** ensureGitignoreIncludes(['.env']) called → **Then** no duplication
- **Given** .gitignore does not exist → **When** ensureGitignoreIncludes(['.env']) called → **Then** .gitignore created with pattern
- **Given** multi-provider config (GitHub + JIRA) → **When** generateEnvFile() called → **Then** both providers in .env

**Test Cases**:

1. **Unit**: `tests/unit/utils/env-file-generator.test.ts` (20 test cases)
   - generateEnvFile_createsNewFile(): First run creates .env
   - generateEnvFile_setsPermissions0600(): Correct permissions
   - generateEnvFile_promptsForOverwrite(): Existing file → prompt
   - generateEnvFile_createsBackup(): Backup created before overwrite
   - generateEnvFile_skipsIfDeclined(): User says no → skip
   - generateEnvContent_githubProvider(): Correct GitHub format
   - generateEnvContent_jiraProvider(): Correct JIRA format
   - generateEnvContent_adoProvider(): Correct ADO format
   - generateEnvContent_multiProvider(): Multiple providers
   - generateEnvExample_noSecrets(): Token masked
   - generateEnvExample_hasComments(): Help text included
   - generateEnvExample_hasExampleValues(): Placeholder values
   - ensureGitignoreIncludes_addsPattern(): .env added
   - ensureGitignoreIncludes_noDuplication(): No duplicate entries
   - ensureGitignoreIncludes_createsFile(): Creates .gitignore if missing
   - ensureGitignoreIncludes_multiplePatterns(): ['.env', '.env.local', '.env.*.local']
   - showSecurityWarning_displaysWarning(): Warning shown
   - validateEnvFile_checksPermissions(): Detects wrong permissions
   - formatRepoMapping_correctFormat(): "id:repo-name,id2:repo-name2"
   - formatRepoMapping_handlesSpecialChars(): Escapes if needed
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:

1. Create file: `src/utils/env-file-generator.ts` (~150 lines)
2. Define EnvFileGenerator class:
   - constructor(projectRoot): Initialize paths
   - generateEnvFile(config): Main entry point
   - generateEnvContent(config): Format .env content
   - generateEnvExample(config): Create .env.example
   - ensureGitignoreIncludes(patterns): Update .gitignore
   - showSecurityWarning(): Display warning message
3. Implement .env content generation:
   - GitHub section: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPOS
   - JIRA section: JIRA_API_TOKEN, JIRA_DOMAIN, JIRA_PROJECT
   - ADO section: AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT
   - Sync config: GITHUB_SYNC_ENABLED, GITHUB_AUTO_CREATE_ISSUE, etc.
4. Implement .env.example generation (mask secrets, add comments)
5. Implement .gitignore updates (check existence, append if missing, avoid duplication)
6. Add permission checks (0600 for .env)
7. Write 20 unit tests with TDD
8. Run tests: `npm test env-file-generator.test.ts` (should pass: 20/20)
9. Verify coverage ≥90%

**TDD Workflow**:
1. 📝 Write all 20 tests above (should fail)
2. ❌ Run tests: `npm test env-file-generator` (0/20 passing)
3. ✅ Implement generateEnvFile() with prompts
4. 🟢 Run tests: `npm test` (5/20 passing)
5. ✅ Implement generateEnvContent() for all providers
6. 🟢 Run tests: `npm test` (15/20 passing)
7. ✅ Implement .gitignore updates
8. 🟢 Run tests: `npm test` (20/20 passing)
9. ♻️ Refactor: Extract provider templates, improve formatting
10. ✅ Final check: Coverage ≥90%

**Dependencies**: None

---

### T-005: Implement Setup Summary Generator

**AC**: AC-US8-01, AC-US8-02, AC-US8-03

**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** setup state with 3 repos (1 parent + 2 implementation) → **When** generateSummary() called → **Then** summary shows "Created Repositories (3 total)"
- **Given** setup state → **When** generateSummary() called → **Then** folder structure section shows correct paths (frontend/, backend/ at root level)
- **Given** setup state → **When** generateSummary() called → **Then** configuration section shows GitHub token configured, sync enabled
- **Given** setup state → **When** generateSummary() called → **Then** next steps section shows "cd frontend && npm install"
- **Given** setup state → **When** generateSummary() called → **Then** tips section shows ".env contains secrets (DO NOT COMMIT!)"
- **Given** 3 repos created → **When** calculateTimeSaved() called → **Then** returns "~15 minutes (vs manual setup)"

**Test Cases**:

1. **Unit**: `tests/unit/repo-structure/setup-summary.test.ts` (10 test cases)
   - generateSummary_singleRepo(): Summary for 1 repo
   - generateSummary_multiRepo(): Summary for 3 repos
   - generateSummary_withoutParent(): Summary without parent repo
   - generateFolderStructure_rootLevel(): Shows frontend/, backend/ (not services/)
   - generateFolderStructure_withEnv(): Shows .env, .env.example
   - generateConfigSection_githubEnabled(): Shows GitHub config
   - generateConfigSection_multiProvider(): Shows multiple providers
   - generateNextSteps_installDeps(): Shows npm install commands
   - generateNextSteps_startIncrement(): Shows /specweave:increment
   - calculateTimeSaved_3repos(): ~15 minutes
   - **Coverage Target**: 80%

2. **Snapshot Tests**: `tests/unit/repo-structure/setup-summary.snapshot.test.ts` (5 test cases)
   - snapshotTest_happyPath(): Full summary snapshot
   - snapshotTest_withParent(): Parent repo summary
   - snapshotTest_withoutParent(): No parent summary
   - snapshotTest_multiProvider(): Multiple providers
   - snapshotTest_emptyState(): Minimal summary
   - **Coverage Target**: 80%

**Overall Coverage Target**: 80%

**Implementation**:

1. Create file: `src/core/repo-structure/setup-summary.ts` (~100 lines)
2. Define SetupSummaryGenerator class:
   - generateSummary(state): Main entry point
   - generateRepositoriesSection(state): List repos with URLs
   - generateFolderStructure(state): Show folder tree
   - generateConfigSection(state): Show configuration details
   - generateNextSteps(state): Show actionable next steps
   - generateTips(): Show best practices
   - calculateTimeSaved(totalRepos): Estimate time saved
3. Implement Markdown formatting with CLI colors:
   - ✅ (green checkmark) for success
   - 📦 (box) for repositories
   - 📁 (folder) for structure
   - ⚙️ (gear) for configuration
   - 🚀 (rocket) for next steps
   - 💡 (lightbulb) for tips
   - ⏱️ (stopwatch) for time saved
4. Implement folder structure ASCII tree generation
5. Write 10 unit tests + 5 snapshot tests
6. Run tests: `npm test setup-summary.test.ts` (should pass: 10/10)
7. Run snapshot tests: `npm test setup-summary.snapshot.test.ts` (should pass: 5/5)
8. Verify coverage ≥80%

**TDD Workflow**:
1. 📝 Write all 15 tests above (should fail)
2. ❌ Run tests: `npm test setup-summary` (0/15 passing)
3. ✅ Implement generateSummary() with all sections
4. 🟢 Run tests: `npm test` (10/15 passing)
5. ✅ Implement snapshot tests
6. 🟢 Run tests: `npm test` (15/15 passing)
7. ♻️ Refactor: Extract formatting helpers, improve readability
8. ✅ Final check: Coverage ≥80%

**Dependencies**: T-001 (repo IDs), T-002 (state structure)

---

### T-006: Implement Prompt Consolidator

**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US9-01, AC-US9-02, AC-US9-03

**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** user runs setup → **When** promptForArchitecture() called → **Then** single prompt shown with 4 options (no separate "polyrepo" prompt)
- **Given** architecture prompt → **When** user selects option 2 → **Then** "Multiple repositories WITH parent" selected
- **Given** repo count prompt → **When** user enters 2 → **Then** shows "Total: 1 parent + 2 implementation = 3 total"
- **Given** repo count = 0 → **When** validation runs → **Then** error "Must have at least 1 repository"
- **Given** repo count = 25 → **When** validation runs → **Then** error "Maximum 20 repositories"
- **Given** parent folder benefits → **When** showParentFolderBenefits() called → **Then** shows 5 benefits with examples and link to docs

**Test Cases**:

1. **Unit**: `tests/unit/repo-structure/prompt-consolidator.test.ts` (15 test cases)
   - promptForArchitecture_showsOptions(): 4 options visible
   - promptForArchitecture_noPolyrepoJargon(): Text says "Multiple separate repositories"
   - promptForArchitecture_hasVisualExamples(): Each option has description
   - promptForArchitecture_defaultWithParent(): Default is option 2
   - promptForArchitecture_selectSingle(): Returns 'single'
   - promptForArchitecture_selectPolyrepoWithParent(): Returns 'polyrepo-with-parent'
   - promptForArchitecture_selectPolyrepoWithoutParent(): Returns 'polyrepo-without-parent'
   - promptForArchitecture_selectMonorepo(): Returns 'monorepo'
   - promptForRepoCount_validInput(): Accepts 2
   - promptForRepoCount_showsTotalCount(): "1 parent + 2 implementation = 3 total"
   - promptForRepoCount_rejectsZero(): Error message shown
   - promptForRepoCount_rejectsExcessive(): Max 20 error
   - showParentFolderBenefits_showsBenefits(): 5 benefits listed
   - showParentFolderBenefits_hasDocLink(): Link to spec-weave.com
   - showParentFolderBenefits_hasExamples(): Concrete examples included
   - **Coverage Target**: 75%

2. **Snapshot Tests**: `tests/unit/repo-structure/prompt-consolidator.snapshot.test.ts` (3 test cases)
   - snapshotTest_architecturePrompt(): Full prompt text
   - snapshotTest_parentBenefits(): Benefits explanation
   - snapshotTest_repoCountPrompt(): Repo count prompt
   - **Coverage Target**: 75%

**Overall Coverage Target**: 75%

**Implementation**:

1. Create file: `src/core/repo-structure/prompt-consolidator.ts` (~150 lines)
2. Define PromptConsolidator class:
   - promptForArchitecture(): Single consolidated prompt
   - promptForRepoCount(): Repo count with clarification
   - showParentFolderBenefits(): Explain benefits
   - validateRepoCount(count): Validation logic
3. Implement architecture prompt options:
   - Option 1: Single repository
   - Option 2: Multiple WITH parent (recommended)
   - Option 3: Multiple WITHOUT parent (not recommended)
   - Option 4: Monorepo
4. Replace "polyrepo" with "Multiple separate repositories (microservices)"
5. Add visual examples for each option (ASCII diagrams)
6. Implement repo count prompt with total calculation
7. Implement parent benefits explanation (5 benefits + examples)
8. Write 15 unit tests + 3 snapshot tests
9. Run tests: `npm test prompt-consolidator.test.ts` (should pass: 15/15)
10. Run snapshot tests: `npm test prompt-consolidator.snapshot.test.ts` (should pass: 3/3)
11. Verify coverage ≥75%

**TDD Workflow**:
1. 📝 Write all 18 tests above (should fail)
2. ❌ Run tests: `npm test prompt-consolidator` (0/18 passing)
3. ✅ Implement promptForArchitecture() with inquirer
4. 🟢 Run tests: `npm test` (8/18 passing)
5. ✅ Implement promptForRepoCount() with validation
6. 🟢 Run tests: `npm test` (15/18 passing)
7. ✅ Implement snapshot tests
8. 🟢 Run tests: `npm test` (18/18 passing)
9. ♻️ Refactor: Extract option text to constants, improve formatting
10. ✅ Final check: Coverage ≥75%

**Dependencies**: None

---

## Phase 2: Integration (T-007 to T-012)

### T-007: Modify repo-structure-manager.ts (Integration)

**AC**: AC-US5-01, AC-US7-01, AC-US7-02, AC-US7-03, AC-US8-01

**Priority**: P1
**Estimate**: 8 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** new setup → **When** setupMultiRepo() called → **Then** checks for incomplete state, shows new setup flow if none
- **Given** incomplete state exists → **When** setupMultiRepo() called → **Then** prompts user to resume, continues from last step
- **Given** repo creation → **When** repository created → **Then** cloned to ROOT LEVEL (e.g., frontend/) NOT services/frontend/
- **Given** all repos created → **When** setup complete → **Then** .env generated, summary shown, state deleted

**Test Cases**:

1. **Integration**: `tests/integration/repo-structure/multi-repo-flow.test.ts` (15 test cases)
   - fullSetupFlow_happyPath(): End-to-end setup with 3 repos
   - fullSetupFlow_rootLevelClone(): Verify repos at root level
   - fullSetupFlow_envCreated(): Verify .env exists
   - fullSetupFlow_summaryShown(): Verify summary displayed
   - fullSetupFlow_stateDeleted(): Verify state file removed
   - resumeSetup_afterParent(): Resume from parent completion
   - resumeSetup_afterRepo1(): Resume from repo 1 completion
   - resumeSetup_skipCompletedSteps(): Don't re-create parent
   - stateManager_integration(): State saves after each step
   - githubValidator_integration(): Validation before creation
   - envGenerator_integration(): .env created at end
   - summaryGenerator_integration(): Summary shown at end
   - promptConsolidator_integration(): Single architecture prompt
   - errorHandling_repoExists(): Offer use existing
   - errorHandling_invalidOwner(): Clear error + retry
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:

1. Modify file: `src/core/repo-structure/repo-structure-manager.ts` (~400 lines affected)
2. Add imports for new modules:
   - SetupStateManager
   - GitHubValidator
   - EnvFileGenerator
   - SetupSummaryGenerator
   - PromptConsolidator
   - RepoIdGenerator
3. Update RepoStructureManager class:
   - Add private fields for all new modules
   - Initialize in constructor
4. Modify setupMultiRepo() method:
   - Step 1: Check for incomplete state (stateManager.detectAndResumeSetup())
   - Step 2: If resume, load state and call resumeSetup()
   - Step 3: If new, prompt for architecture (promptConsolidator.promptForArchitecture())
   - Step 4: Initialize state, save initial state
   - Step 5: For each repo:
     - Auto-generate ID (repoIdGenerator.generateRepoId())
     - Prompt for visibility
     - Validate with GitHub API (githubValidator.validateRepository())
     - Create repo on GitHub
     - Clone to ROOT LEVEL: path.join(projectRoot, repo.path) NOT path.join(projectRoot, 'services', repo.path)
     - Save state after each step
   - Step 6: Generate .env (envGenerator.generateEnvFile())
   - Step 7: Show summary (summaryGenerator.generateSummary())
   - Step 8: Delete state (stateManager.deleteState())
5. Implement resumeSetup() method:
   - Load state from file
   - Skip completed repos
   - Continue from currentStep
   - Preserve all configuration
6. Replace services/ folder with root-level cloning (line 319):
   - OLD: `const targetPath = path.join(this.projectRoot, 'services', repo.path);`
   - NEW: `const targetPath = path.join(this.projectRoot, repo.path);`
7. Consolidate architecture prompts (lines 65-87, 203-208):
   - Remove separate polyrepo prompt
   - Use promptConsolidator.promptForArchitecture()
8. Write 15 integration tests
9. Run tests: `npm test multi-repo-flow.test.ts` (should pass: 15/15)
10. Verify coverage ≥85%

**TDD Workflow**:
1. 📝 Write all 15 tests above (should fail)
2. ❌ Run tests: `npm test multi-repo-flow` (0/15 passing)
3. ✅ Integrate SetupStateManager (save/load/resume)
4. 🟢 Run tests: `npm test` (5/15 passing)
5. ✅ Integrate GitHubValidator (validate before create)
6. 🟢 Run tests: `npm test` (10/15 passing)
7. ✅ Integrate EnvFileGenerator + SetupSummaryGenerator
8. 🟢 Run tests: `npm test` (15/15 passing)
9. ♻️ Refactor: Extract repo creation logic, improve error handling
10. ✅ Final check: Coverage ≥85%

**Dependencies**: T-001, T-002, T-003, T-004, T-005, T-006

---

### T-008: Modify github-multi-repo.ts (Integration)

**AC**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US3-01, AC-US3-02, AC-US4-01, AC-US1-02

**Priority**: P1
**Estimate**: 6 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** user enters repo name "my-saas-frontend" → **When** promptForRepository() called → **Then** ID auto-generated as "frontend" shown as default
- **Given** generated ID "frontend" → **When** user accepts default → **Then** ID "frontend" used
- **Given** generated ID "frontend" → **When** user edits to "fe" → **Then** ID "fe" validated and used
- **Given** repo prompt → **When** visibility prompt shown → **Then** default is "Private"
- **Given** repo name entered → **When** GitHub validator checks → **Then** repo existence validated before creation
- **Given** repo exists (200 response) → **When** validation runs → **Then** prompts "Use existing? [Y/n]"
- **Given** prompt text → **When** displayed → **Then** says "Multiple separate repositories" NOT "polyrepo"

**Test Cases**:

1. **Integration**: `tests/integration/repo-structure/github-multi-repo.test.ts` (12 test cases)
   - promptForRepository_autoGeneratesId(): "my-frontend" → default "frontend"
   - promptForRepository_acceptsDefaultId(): User accepts → "frontend" used
   - promptForRepository_editsId(): User changes to "fe" → "fe" used
   - promptForRepository_validatesEditedId(): Invalid ID → error + retry
   - promptForRepository_visibilityPrompt(): Shows Private/Public options
   - promptForRepository_defaultPrivate(): Default is "Private"
   - promptForRepository_githubValidation(): Validates before creation
   - promptForRepository_repoExists(): Offers "Use existing"
   - promptForRepository_useExisting(): User says yes → existing repo used
   - promptForRepository_retryOnExists(): User says no → retry prompt
   - promptText_noPolyrepoJargon(): Says "Multiple separate repositories"
   - uniqueIdGeneration_handlesDuplicates(): "frontend" exists → "frontend-2"
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:

1. Modify file: `src/cli/helpers/issue-tracker/github-multi-repo.ts` (~300 lines affected)
2. Add imports:
   - RepoIdGenerator
   - GitHubValidator
3. Update GitHubMultiRepoHelper class:
   - Add private fields: repoIdGenerator, githubValidator
   - Initialize in constructor
4. Modify promptForRepository() method:
   - Step 1: Prompt for repository name (existing logic)
   - Step 2: Auto-generate ID from name (NEW - lines 288-302):
     ```typescript
     const generatedId = this.repoIdGenerator.generateRepoId(repoName);
     const uniqueId = this.repoIdGenerator.ensureUniqueId(
       generatedId,
       new Set(existingRepos.map(r => r.id))
     );
     ```
   - Step 3: Show ID prompt with generated ID as default (NEW):
     ```typescript
     const idAnswer = await inquirer.prompt([
       {
         type: 'input',
         name: 'id',
         message: 'Repository ID:',
         default: uniqueId.id,
         validate: (input) => this.repoIdGenerator.validateRepoId(input)
       }
     ]);
     ```
   - Step 4: Prompt for visibility (NEW - after line 338):
     ```typescript
     const visibilityAnswer = await inquirer.prompt([
       {
         type: 'list',
         name: 'visibility',
         message: 'Repository visibility:',
         choices: [
           { name: 'Private (recommended for security)', value: 'private' },
           { name: 'Public', value: 'public' }
         ],
         default: 'private'
       }
     ]);
     ```
   - Step 5: Validate with GitHub API (NEW):
     ```typescript
     console.log('Validating repository...');
     const validation = await this.githubValidator.validateRepository(owner, repoName);

     if (!validation.valid) {
       console.error(`❌ ${validation.error}`);
       return this.promptForRepository(existingRepos); // Retry
     }

     if (validation.exists) {
       console.log(`⚠️  Repository already exists: ${validation.url}`);
       const useExisting = await this.promptUseExisting();
       if (useExisting) {
         return { id: idAnswer.id, repo: repoName, created: true, url: validation.url };
       }
       return this.promptForRepository(existingRepos); // Retry
     }
     ```
   - Step 6: Return repository config
5. Update prompt text to remove "polyrepo" jargon (lines 106-132):
   - Replace "polyrepo" with "Multiple separate repositories (microservices)"
   - Update help text and examples
6. Add promptUseExisting() helper method
7. Write 12 integration tests
8. Run tests: `npm test github-multi-repo.test.ts` (should pass: 12/12)
9. Verify coverage ≥85%

**TDD Workflow**:
1. 📝 Write all 12 tests above (should fail)
2. ❌ Run tests: `npm test github-multi-repo` (0/12 passing)
3. ✅ Integrate RepoIdGenerator (auto-generate IDs)
4. 🟢 Run tests: `npm test` (4/12 passing)
5. ✅ Add visibility prompt
6. 🟢 Run tests: `npm test` (8/12 passing)
7. ✅ Integrate GitHubValidator (validate before create)
8. 🟢 Run tests: `npm test` (12/12 passing)
9. ♻️ Refactor: Extract prompt logic, improve error handling
10. ✅ Final check: Coverage ≥85%

**Dependencies**: T-001, T-003

---

### T-009: Update .gitignore

**AC**: AC-US5-02, AC-US6-02

**Priority**: P1
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** .gitignore file → **When** updated → **Then** contains root-level repo patterns (frontend/, backend/, mobile/, shared/)
- **Given** .gitignore file → **When** updated → **Then** contains .env patterns (.env, .env.local, .env.*.local)
- **Given** .gitignore file → **When** updated → **Then** contains SpecWeave logs pattern (.specweave/logs/)

**Test Cases**:

1. **Unit**: `tests/unit/gitignore/gitignore-update.test.ts` (5 test cases)
   - gitignoreUpdate_addsRootLevelRepos(): frontend/, backend/, etc. added
   - gitignoreUpdate_addsEnvPatterns(): .env patterns added
   - gitignoreUpdate_addsLogsPattern(): .specweave/logs/ added
   - gitignoreUpdate_noDuplication(): Running twice doesn't duplicate
   - gitignoreUpdate_preservesExisting(): Existing patterns unchanged
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:

1. Modify file: `.gitignore` (~10 lines added)
2. Add SpecWeave multi-repo section:
   ```gitignore
   # SpecWeave - Multi-Repo Setup (auto-generated)
   # Ignore implementation repos (cloned from GitHub)
   frontend/
   backend/
   mobile/
   shared/

   # Environment variables (contains secrets!)
   .env
   .env.local
   .env.*.local

   # SpecWeave logs
   .specweave/logs/
   ```
3. Add comment header explaining section
4. Write 5 unit tests
5. Run tests: `npm test gitignore-update.test.ts` (should pass: 5/5)
6. Verify coverage ≥90%

**Dependencies**: None

---

### T-010: Create .env.example Template

**AC**: AC-US6-03

**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** .env.example template → **When** viewed → **Then** contains GitHub configuration section with masked tokens
- **Given** .env.example template → **When** viewed → **Then** contains helpful comments explaining each variable
- **Given** .env.example template → **When** viewed → **Then** contains example values (placeholders)
- **Given** .env.example template → **When** viewed → **Then** safe to commit (no secrets)

**Test Cases**:

1. **Unit**: `tests/unit/templates/env-example.test.ts` (8 test cases)
   - envExample_hasGitHubSection(): GitHub config present
   - envExample_tokenMasked(): GITHUB_TOKEN= (empty)
   - envExample_hasComments(): Help text for each variable
   - envExample_hasExampleValues(): Placeholder values shown
   - envExample_hasSyncConfig(): Sync settings present
   - envExample_safeToCommit(): No actual secrets
   - envExample_multiProvider(): JIRA/ADO sections (commented)
   - envExample_hasLinks(): Links to GitHub settings page
   - **Coverage Target**: 80%

**Overall Coverage Target**: 80%

**Implementation**:

1. Create file: `src/templates/.env.example` (~50 lines)
2. Add header comment explaining purpose
3. Add GitHub configuration section:
   ```bash
   # =============================================================================
   # GitHub Settings
   # =============================================================================

   # GitHub Personal Access Token (REQUIRED)
   # Generate at: https://github.com/settings/tokens
   # Scope: repo
   GITHUB_TOKEN=

   # GitHub Owner (REQUIRED)
   # Your username or organization name
   GITHUB_OWNER=

   # Repository Mapping (REQUIRED)
   # Format: id:repo-name,id2:repo-name2
   GITHUB_REPOS=parent:my-project-parent,frontend:my-project-frontend
   ```
4. Add sync configuration section:
   ```bash
   # =============================================================================
   # Sync Configuration
   # =============================================================================

   GITHUB_SYNC_ENABLED=true
   GITHUB_AUTO_CREATE_ISSUE=true
   GITHUB_SYNC_DIRECTION=bidirectional
   ```
5. Add optional JIRA/ADO sections (commented)
6. Write 8 unit tests
7. Run tests: `npm test env-example.test.ts` (should pass: 8/8)
8. Verify coverage ≥80%

**Dependencies**: None

---

### T-011: Add Visibility Prompt to Repository Creation

**AC**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** repository prompt → **When** visibility prompt shown → **Then** options are "Private" and "Public"
- **Given** visibility prompt → **When** default selected → **Then** "Private" chosen
- **Given** visibility selected → **When** saved to config → **Then** stored in repository configuration
- **Given** repository creation → **When** GitHub API called → **Then** visibility parameter passed

**Test Cases**:

1. **Unit**: `tests/unit/repo-structure/visibility-prompt.test.ts` (6 test cases)
   - visibilityPrompt_showsOptions(): Private/Public visible
   - visibilityPrompt_defaultPrivate(): Default is "Private"
   - visibilityPrompt_selectPublic(): User can select "Public"
   - visibilityPrompt_saveToConfig(): Visibility stored in config
   - visibilityPrompt_passToAPI(): Visibility in API call
   - visibilityPrompt_securityWarning(): Warning shown for Public selection
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:

1. Modify file: `src/cli/helpers/issue-tracker/github-multi-repo.ts` (add prompt)
2. Add visibility prompt after repo name and ID prompts:
   ```typescript
   const visibilityAnswer = await inquirer.prompt([
     {
       type: 'list',
       name: 'visibility',
       message: 'Repository visibility:',
       choices: [
         { name: 'Private (recommended for security)', value: 'private' },
         { name: 'Public', value: 'public' }
       ],
       default: 'private'
     }
   ]);

   if (visibilityAnswer.visibility === 'public') {
     console.log('⚠️  Warning: Public repositories are visible to everyone on GitHub.');
   }
   ```
3. Update RepositoryConfig interface to include visibility field
4. Modify GitHub API call to pass visibility parameter:
   ```typescript
   await octokit.repos.createForAuthenticatedUser({
     name: repo.repo,
     private: repo.visibility === 'private',
     // ... other params
   });
   ```
5. Write 6 unit tests
6. Run tests: `npm test visibility-prompt.test.ts` (should pass: 6/6)
7. Verify coverage ≥85%

**Dependencies**: T-008

---

### T-012: Update Configuration Schema

**AC**: AC-US5-01, AC-US6-01, AC-US3-01

**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** repository config → **When** validated → **Then** visibility field required
- **Given** repository config → **When** validated → **Then** path field allows root-level paths
- **Given** .env config → **When** validated → **Then** multi-provider configuration allowed

**Test Cases**:

1. **Unit**: `tests/unit/core/config-schema.test.ts` (8 test cases)
   - configSchema_visibilityRequired(): Error if missing
   - configSchema_visibilityEnum(): Only 'private' or 'public' allowed
   - configSchema_pathRootLevel(): Allows "frontend/" not "services/frontend/"
   - configSchema_pathValidation(): Rejects invalid paths
   - configSchema_envMultiProvider(): Allows GitHub + JIRA + ADO
   - configSchema_envProviderConfig(): Each provider has required fields
   - configSchema_repoMapping(): Validates "id:repo-name" format
   - configSchema_syncConfig(): Validates sync settings
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:

1. Modify file: `src/core/schemas/specweave-config.schema.json` (~20 lines added)
2. Add visibility field to RepositoryConfig:
   ```json
   "visibility": {
     "type": "string",
     "enum": ["private", "public"],
     "default": "private",
     "description": "Repository visibility (private or public)"
   }
   ```
3. Update path field to allow root-level paths:
   ```json
   "path": {
     "type": "string",
     "pattern": "^[a-z0-9-]+/$",
     "description": "Local folder path (root-level, e.g., frontend/)"
   }
   ```
4. Add .env configuration schema:
   ```json
   "env": {
     "type": "object",
     "properties": {
       "providers": {
         "type": "array",
         "items": {
           "type": "object",
           "properties": {
             "type": { "enum": ["github", "jira", "ado"] },
             "config": { "type": "object" }
           }
         }
       }
     }
   }
   ```
5. Write 8 unit tests
6. Run tests: `npm test config-schema.test.ts` (should pass: 8/8)
7. Verify coverage ≥85%

**Dependencies**: None

---

## Phase 3: E2E Validation (T-013 to T-020)

### T-013: E2E Test - Happy Path (Multi-Repo Setup)

**AC**: All acceptance criteria (end-to-end validation)

**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** user runs `specweave init my-project` → **When** selects "Multiple WITH parent" + enters 2 repos → **Then** all repos created, .env exists, summary shown, no errors

**Test Cases**:

1. **E2E**: `tests/e2e/init/multi-repo-setup.spec.ts` (1 test case)
   - multiRepoSetup_happyPath(): Full end-to-end flow with 3 repos
   - **Coverage Target**: 100% (critical path)

**Overall Coverage Target**: 100%

**Implementation**:

1. Create file: `tests/e2e/init/multi-repo-setup.spec.ts` (~50 lines)
2. Write comprehensive E2E test (see plan.md for full code)
3. Verify all files created:
   - .specweave/ directory
   - .env file
   - .env.example file
   - frontend/ directory (root level)
   - backend/ directory (root level)
   - NOT services/ directory
4. Verify summary shown with correct content
5. Run test: `npm run test:e2e multi-repo-setup.spec.ts` (should pass: 1/1)

**Dependencies**: T-007, T-008, T-009, T-010

---

### T-014: E2E Test - Ctrl+C Recovery

**AC**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04

**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** setup interrupted after parent created → **When** user resumes → **Then** continues from repo 1, skips parent, all repos created successfully

**Test Cases**:

1. **E2E**: `tests/e2e/init/resume-setup.spec.ts` (1 test case)
   - resumeSetup_afterParentCreated(): Ctrl+C recovery successful
   - **Coverage Target**: 100% (critical path)

**Overall Coverage Target**: 100%

**Implementation**:

1. Create file: `tests/e2e/init/resume-setup.spec.ts` (~40 lines)
2. Write Ctrl+C recovery test (see plan.md for full code)
3. Simulate Ctrl+C by closing browser mid-setup
4. Verify state file exists with correct content
5. Resume setup in new browser session
6. Verify resume prompt shown with progress
7. Verify setup continues from last step
8. Verify state file deleted on completion
9. Run test: `npm run test:e2e resume-setup.spec.ts` (should pass: 1/1)

**Dependencies**: T-002, T-007

---

### T-015: E2E Test - Repository Already Exists

**AC**: AC-US4-03, AC-US4-04

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** repository "my-project-frontend" already exists on GitHub → **When** validation runs → **Then** shows "Repository already exists" + offers "Use existing" option

**Test Cases**:

1. **E2E**: `tests/e2e/init/error-handling.spec.ts` (1 test case - repository exists)
   - errorHandling_repositoryExists(): Offers use existing option
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:

1. Create file: `tests/e2e/init/error-handling.spec.ts` (~30 lines)
2. Mock GitHub API to return 200 (repo exists)
3. Verify warning message shown
4. Verify "Use Existing" and "Enter Different Name" buttons visible
5. Test both paths:
   - User clicks "Use Existing" → existing repo used
   - User clicks "Enter Different Name" → retry prompt
6. Run test: `npm run test:e2e error-handling.spec.ts` (should pass: 1/1)

**Dependencies**: T-003, T-007, T-008

---

### T-016: E2E Test - Invalid Owner

**AC**: AC-US4-02

**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** owner "nonexistent-org-12345" does not exist → **When** validation runs → **Then** shows "Owner not found" error + allows retry

**Test Cases**:

1. **E2E**: `tests/e2e/init/error-handling.spec.ts` (1 test case - invalid owner)
   - errorHandling_invalidOwner(): Clear error + retry
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:

1. Add test to `tests/e2e/init/error-handling.spec.ts` (~25 lines)
2. Mock GitHub API to return 404 for /users/{owner} and /orgs/{owner}
3. Verify error message: "Owner 'nonexistent-org-12345' not found"
4. Verify retry prompt shown
5. Mock correct owner on retry
6. Verify setup continues successfully
7. Run test: `npm run test:e2e error-handling.spec.ts` (should pass: 2/2 total)

**Dependencies**: T-003, T-007, T-008

---

### T-017: E2E Test - Network Failure

**AC**: AC-US7-01 (state persistence on failure)

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** network failure during GitHub API call → **When** retries 3 times → **Then** shows clear error message + state saved for resume

**Test Cases**:

1. **E2E**: `tests/e2e/init/error-handling.spec.ts` (1 test case - network failure)
   - errorHandling_networkFailure(): Retries + saves state
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:

1. Add test to `tests/e2e/init/error-handling.spec.ts` (~30 lines)
2. Mock GitHub API to throw network error (fetch fails)
3. Verify retry logic (3 attempts with exponential backoff)
4. Verify error message: "Network error: ..."
5. Verify state saved before failure
6. Verify user can resume after fixing network
7. Run test: `npm run test:e2e error-handling.spec.ts` (should pass: 3/3 total)

**Dependencies**: T-002, T-003, T-007

---

### T-018: E2E Test - Rate Limit Exceeded

**AC**: AC-US4-01 (GitHub API validation)

**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** GitHub API rate limit exceeded (403) → **When** validation runs → **Then** shows rate limit error + time until reset

**Test Cases**:

1. **E2E**: `tests/e2e/init/error-handling.spec.ts` (1 test case - rate limit)
   - errorHandling_rateLimitExceeded(): Shows reset time
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:

1. Add test to `tests/e2e/init/error-handling.spec.ts` (~25 lines)
2. Mock GitHub API to return 403 with X-RateLimit-Remaining: 0
3. Verify error message includes reset time
4. Verify state saved (user can resume later)
5. Run test: `npm run test:e2e error-handling.spec.ts` (should pass: 4/4 total)

**Dependencies**: T-003, T-007

---

### T-019: E2E Test - Duplicate Repository ID

**AC**: AC-US2-04

**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** repository ID "frontend" already used → **When** user enters another "frontend" → **Then** auto-suggests "frontend-2"

**Test Cases**:

1. **E2E**: `tests/e2e/init/error-handling.spec.ts` (1 test case - duplicate ID)
   - errorHandling_duplicateRepoId(): Auto-suffix applied
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:

1. Add test to `tests/e2e/init/error-handling.spec.ts` (~20 lines)
2. Create setup with repo 1 ID = "frontend"
3. Enter repo 2 with ID = "frontend" (duplicate)
4. Verify auto-suggestion: "frontend-2"
5. Verify user can accept or edit
6. Run test: `npm run test:e2e error-handling.spec.ts` (should pass: 5/5 total)

**Dependencies**: T-001, T-007, T-008

---

### T-020: E2E Test - .env File Overwrite

**AC**: AC-US6-01

**Priority**: P2
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** .env file already exists → **When** setup runs → **Then** prompts "Overwrite? [y/N]" + creates backup if yes

**Test Cases**:

1. **E2E**: `tests/e2e/init/error-handling.spec.ts` (1 test case - .env overwrite)
   - errorHandling_envFileOverwrite(): Backup + overwrite
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:

1. Add test to `tests/e2e/init/error-handling.spec.ts` (~25 lines)
2. Pre-create .env file with dummy content
3. Run setup, verify overwrite prompt shown
4. Test "No" path: .env unchanged
5. Test "Yes" path: .env.backup created, new .env written
6. Run test: `npm run test:e2e error-handling.spec.ts` (should pass: 6/6 total)

**Dependencies**: T-004, T-007

---

## Phase 4: Documentation (T-021 to T-024)

### T-021: Update Multi-Repo Setup Guide

**AC**: AC-US8-02 (documentation links)

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** multi-repo setup guide → **When** user reads → **Then** explains quick start, folder structure, repo IDs, Ctrl+C recovery, security best practices

**Test Cases**:

1. **Manual Validation**: Review documentation for completeness
   - Quick start section: Step-by-step instructions
   - Folder structure section: Visual diagram
   - Repository IDs section: Auto-generation examples
   - Ctrl+C recovery section: Resume instructions
   - Security section: .env best practices
   - **Validation**: Manual review by 2 team members

**Implementation**:

1. Update file: `docs-site/docs/guides/multi-repo-setup.md` (~100 lines added)
2. Add sections (see plan.md for full content):
   - Quick Start (4 steps)
   - What Gets Created (folder structure diagram)
   - Repository IDs (auto-generation examples)
   - Ctrl+C Recovery (resume instructions)
   - Security Best Practices (5 tips)
3. Add screenshots (optional but recommended)
4. Review with team
5. Build docs: `npm run build:docs` (should succeed)
6. Preview: `npm run serve:docs` (manual check)

**Dependencies**: T-001, T-002, T-003, T-004, T-007, T-008

---

### T-022: Create Ctrl+C Recovery Guide

**AC**: AC-US7-02, AC-US7-03 (resume explanation)

**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** Ctrl+C recovery guide → **When** user reads → **Then** explains how state is saved, how to resume, what data is preserved

**Test Cases**:

1. **Manual Validation**: Review documentation for accuracy
   - State persistence explanation
   - Resume workflow diagram
   - Example scenarios (3+)
   - **Validation**: Manual review by 2 team members

**Implementation**:

1. Create file: `docs-site/docs/guides/ctrl-c-recovery.md` (~50 lines)
2. Add sections:
   - How It Works (state persistence explanation)
   - Resume Workflow (step-by-step)
   - Example Scenarios (interrupt after parent, interrupt after repo 1, etc.)
   - Troubleshooting (corrupted state, manual cleanup)
3. Add diagrams (state machine)
4. Review with team
5. Build docs: `npm run build:docs` (should succeed)

**Dependencies**: T-002

---

### T-023: Create .env Security Guide

**AC**: AC-US6-02 (.env security)

**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** .env security guide → **When** user reads → **Then** explains why .env is dangerous, how to protect it, what to do if committed

**Test Cases**:

1. **Manual Validation**: Review documentation for completeness
   - Why .env is sensitive
   - How to protect (permissions, .gitignore)
   - What to do if leaked (regenerate tokens, audit commits)
   - **Validation**: Manual review by security team

**Implementation**:

1. Create file: `docs-site/docs/guides/env-security.md` (~75 lines)
2. Add sections:
   - Why .env Is Sensitive (contains secrets)
   - Protection Best Practices (5 tips)
   - Accidental Commit Recovery (step-by-step)
   - Team Sharing (.env.example workflow)
   - CI/CD Secrets Management (brief overview)
3. Add warning callouts
4. Review with security team
5. Build docs: `npm run build:docs` (should succeed)

**Dependencies**: T-004

---

### T-024: Update Troubleshooting Guide

**AC**: All acceptance criteria (comprehensive troubleshooting)

**Priority**: P2
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan** (BDD format):
- **Given** troubleshooting guide → **When** user encounters issue → **Then** finds solution for common problems (repo exists, invalid owner, network failure, etc.)

**Test Cases**:

1. **Manual Validation**: Review documentation for common issues
   - 10+ common problems covered
   - Clear solutions for each
   - Links to relevant docs
   - **Validation**: Manual review by support team

**Implementation**:

1. Update file: `docs-site/docs/guides/troubleshooting.md` (~100 lines added)
2. Add sections for each common issue:
   - Repository Already Exists (solution: use existing or rename)
   - Invalid Owner (solution: check spelling, try user vs org)
   - Network Failure (solution: retry, check connectivity)
   - Rate Limit Exceeded (solution: wait, use personal token)
   - Corrupted State File (solution: delete and restart)
   - .env Not Created (solution: check permissions, re-run)
   - Repos Cloned to Wrong Location (solution: check config, move manually)
   - GitHub Token Invalid (solution: regenerate, check scopes)
   - Permissions Denied (solution: check file permissions, run as user)
   - Duplicate Repository ID (solution: accept auto-suffix or edit)
3. Add FAQ section
4. Review with support team
5. Build docs: `npm run build:docs` (should succeed)

**Dependencies**: All previous tasks (comprehensive troubleshooting)

---

## Summary

**Total Tasks**: 24
**Estimated Time**: ~65 hours (13 working days)

**Phase Breakdown**:
- Phase 1 (Core Modules): 6 tasks, 25 hours
- Phase 2 (Integration): 6 tasks, 22 hours
- Phase 3 (E2E Validation): 8 tasks, 20 hours (but 6 are in one file)
- Phase 4 (Documentation): 4 tasks, 10 hours

**Coverage Targets**:
- Overall: 85%+
- Critical paths (ID gen, state, .env): 90%+
- GitHub integration: 85%+
- Prompts: 75%+

**Dependencies**:
- Phase 1 has no dependencies (can start immediately)
- Phase 2 depends on Phase 1
- Phase 3 depends on Phases 1 + 2
- Phase 4 depends on all previous phases

**Risk Areas**:
- T-002 (Setup State Manager): Most complex, highest risk of bugs
- T-007 (repo-structure-manager integration): Large file, many changes
- T-003 (GitHub Validator): External API dependency, network issues

**Success Criteria**:
- All 24 tasks completed with ≥85% coverage
- All E2E tests passing (100% critical path coverage)
- Documentation complete and reviewed
- Setup time reduced by 60% (measured in user testing)
- Error rate reduced by 90% (measured in telemetry)
